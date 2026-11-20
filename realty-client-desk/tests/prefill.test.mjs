// C-1(2026-11-20): 매물 알림 후보 받기(A6 계약) — 재검사·중복 경고·단계·기한·opener 정리, 그리고 보내는 쪽과 이어 붙인 연결 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { HANDOFF_MS, LISTING_ORIGINS, findSimilar, startDeskReceive, validateCandidateFields } from "../src/lib/desk/prefill.ts";
// 연결 시험 전용: 보내는 쪽 순수 함수(다른 프로그램 폴더, 시험에서만 읽음 — 제품 코드끼리는 서로 부르지 않음)
import { DESK_ORIGIN, buildDeskFields, startDeskSend } from "../../realty-listing-alert/lib/deskCandidate.ts";

const ok = { title: "백송마을5단지 503동", address: "백송마을5단지", dealType: "매매", price: 42000, monthly: null, area: 84.9, floorInfo: "12/25", direction: "남향" };
const flush = () => new Promise((r) => setImmediate(r));

test("재검사: 허용 칸만·길이·형식·숫자 범위", () => {
  assert.deepEqual(validateCandidateFields(ok), ok);
  assert.equal(validateCandidateFields({ ...ok, phone: "010-1234-5678" }), null, "화이트리스트 밖 칸");
  assert.equal(validateCandidateFields({ ...ok, title: "백송 010 1234 5678" }), null, "전화번호 모양");
  assert.equal(validateCandidateFields({ ...ok, address: "x".repeat(121) }), null);
  assert.equal(validateCandidateFields({ ...ok, title: "<script>" }), null);
  assert.equal(validateCandidateFields({ ...ok, title: " " }), null);
  assert.equal(validateCandidateFields({ ...ok, dealType: "단기임대" }), null);
  assert.equal(validateCandidateFields({ ...ok, price: -1 }), null);
  assert.equal(validateCandidateFields({ ...ok, price: 1.5 }), null);
  assert.equal(validateCandidateFields({ ...ok, monthly: 100 }), null, "매매에 월세");
  assert.equal(validateCandidateFields({ ...ok, area: "84" }), null);
  assert.equal(validateCandidateFields(null), null);
  assert.equal(validateCandidateFields([ok]), null);
  assert.ok(validateCandidateFields({ ...ok, dealType: "월세", monthly: 120 }));
});

test("비슷한 매물 경고: 거래·가격·면적 ±1㎡·단지명", () => {
  const mine = [
    { id: "a", title: "백송마을5단지 84㎡ 남향", deal_type: "매매", price: 42000, area_m2: 84.5 },
    { id: "b", title: "백송마을5단지", deal_type: "전세", price: 42000, area_m2: 84.9 },
    { id: "c", title: "백송마을5단지", deal_type: "매매", price: 41000, area_m2: 84.9 },
    { id: "d", title: "강촌마을", deal_type: "매매", price: 42000, area_m2: 84.9 },
  ];
  assert.deepEqual(findSimilar(ok, mine).map((l) => l.id), ["a"]);
});

function receiver(opts = {}) {
  let t = 0;
  const timers = new Map();
  let nextTimer = 1;
  const listeners = new Set();
  const posted = [];
  const got = [];
  let rejected = 0;
  let openerCleared = 0;
  const opener = opts.noOpener ? null : { postMessage: (data, origin) => posted.push({ data, origin }) };
  const stop = startDeskReceive({
    opener,
    clearOpener: () => openerCleared++,
    listen: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    setTimer: (fn, ms) => { const id = nextTimer++; timers.set(id, { at: t + ms, fn }); return id; },
    clearTimer: (id) => timers.delete(id),
    now: () => t,
    newId: () => "ready-00000001",
    getAcct: async () => (opts.acct === undefined ? "0123456789abcdef" : opts.acct),
    onCandidate: (p) => got.push(p),
    onRejected: () => rejected++,
  });
  const deliver = (e) => [...listeners].forEach((fn) => fn(e));
  const advance = (ms) => { t += ms; for (const [id, tm] of [...timers]) if (tm.at <= t) { timers.delete(id); tm.fn(); } };
  return { opener, posted, got, listeners, timers, deliver, advance, stop, rejected: () => rejected, cleared: () => openerCleared };
}
const cand = (fields = ok, acct = "0123456789abcdef") => ({ v: 1, type: "desk-candidate", requestId: "req-00000001", readyId: "ready-00000001", acct, fields });

test("opener 없으면 아무것도 안 함(일반 방문)", async () => {
  const r = receiver({ noOpener: true });
  await flush();
  assert.equal(r.listeners.size, 0);
  assert.equal(r.timers.size, 0);
});

test("정상 흐름: READY(두 출처·acct) → 후보 1건 → 폼 채움 → ACK → opener 끊기", async () => {
  const r = receiver();
  await flush();
  assert.deepEqual(r.posted.map((p) => p.origin), [...LISTING_ORIGINS]);
  assert.ok(r.posted.every((p) => p.data.type === "desk-ready" && p.data.acct === "0123456789abcdef" && p.data.readyId === "ready-00000001"));
  r.posted.length = 0;
  const origin = LISTING_ORIGINS[0];
  r.deliver({ origin: "https://evil.example", source: r.opener, data: cand() });
  r.deliver({ origin, source: {}, data: cand() });
  r.deliver({ origin, source: r.opener, data: cand(ok, "ffffffffffffffff") }); // 다른 계정 → 처리 안 함
  r.deliver({ origin, source: r.opener, data: { ...cand(), readyId: "ready-99999999" } });
  assert.equal(r.got.length, 0);
  assert.equal(r.cleared(), 0, "ACK 전에는 opener 유지");
  r.deliver({ origin, source: r.opener, data: cand() });
  r.deliver({ origin, source: r.opener, data: cand() }); // 두 번째 후보 무시
  assert.deepEqual(r.got, [ok]);
  assert.deepEqual(r.posted, [{ data: { v: 1, type: "desk-filled", readyId: "ready-00000001", requestId: "req-00000001", ok: true }, origin }]);
  assert.ok(!("acct" in r.posted[0].data) && !("fields" in r.posted[0].data), "ACK에 계정값·매물값 없음");
  assert.equal(r.cleared(), 1);
  assert.equal(r.listeners.size, 0);
  assert.equal(r.timers.size, 0);
});

test("값이 어긋나면 채우지 않고 ok:false ACK", async () => {
  const r = receiver();
  await flush();
  r.posted.length = 0;
  r.deliver({ origin: LISTING_ORIGINS[1], source: r.opener, data: cand({ ...ok, phone: "010" }) });
  assert.equal(r.got.length, 0);
  assert.equal(r.rejected(), 1);
  assert.equal(r.posted[0].data.ok, false);
  assert.equal(r.posted[0].origin, LISTING_ORIGINS[1]);
});

test("15초 안에 후보가 없으면 끝·opener 끊기, 늦은 후보 무시", async () => {
  const r = receiver();
  await flush();
  r.advance(HANDOFF_MS + 1);
  assert.equal(r.cleared(), 1);
  assert.equal(r.listeners.size, 0);
  r.deliver({ origin: LISTING_ORIGINS[0], source: r.opener, data: cand() });
  assert.equal(r.got.length, 0);
});

test("계정값을 못 받거나 화면을 먼저 떠나면 READY를 보내지 않음", async () => {
  const a = receiver({ acct: null });
  await flush();
  assert.equal(a.posted.length, 0);
  const b = receiver();
  b.stop();
  await flush();
  assert.equal(b.posted.length, 0);
  assert.equal(b.listeners.size, 0);
});

// ── 연결 시험: 실제 두 상태 기계를 가짜 창 두 개로 이어 붙임 ──
function link({ senderAcct = "0123456789abcdef", deskAcct = "0123456789abcdef" } = {}) {
  const sL = new Set(), dL = new Set();
  const fire = (set, e) => setImmediate(() => [...set].forEach((fn) => fn(e)));
  const listingWin = {}; // 매물 알림 창(고객관리 쪽에서 본 opener)
  const deskWin = {}; // 고객관리 창(매물 알림 쪽에서 본 w)
  const sent = [];
  listingWin.postMessage = (data, origin) => { if (origin === LISTING_ORIGINS[0]) fire(sL, { origin: DESK_ORIGIN, source: deskWin, data }); };
  deskWin.postMessage = (data, origin) => { sent.push(data); if (origin === DESK_ORIGIN) fire(dL, { origin: LISTING_ORIGINS[0], source: listingWin, data }); };
  const timerDeps = { setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (t) => clearTimeout(t), now: () => Date.now(), newId: () => crypto.randomUUID() };
  const results = [], filled = [];
  return new Promise((resolve) => {
    startDeskSend(buildDeskFields(["단지명", "동", "거래 종류", "가격(만 원)", "전용면적(㎡)", "층", "방향", "휴대폰"], ["백송마을5단지", "503동", "매매", "4억 2,000", "84.9", "12/25", "남향", "010-1234-5678"]), {
      ...timerDeps,
      open: () => {
        setImmediate(() => startDeskReceive({ ...timerDeps, opener: listingWin, clearOpener: () => {}, listen: (fn) => { dL.add(fn); return () => dL.delete(fn); }, getAcct: async () => deskAcct, onCandidate: (p) => filled.push(p), onRejected: () => {} }));
        return deskWin;
      },
      listen: (fn) => { sL.add(fn); return () => sL.delete(fn); },
      getAcct: async () => senderAcct,
      notify: (r) => { results.push(r); setTimeout(() => resolve({ results, filled, sent, sL: sL.size, dL: dL.size }), 5); },
    });
  });
}

test("연결: 같은 계정이면 고객관리 폼에 채워지고 전화번호는 넘어가지 않음", async () => {
  const r = await link();
  assert.deepEqual(r.results, ["filled"]);
  assert.equal(r.filled.length, 1);
  assert.equal(r.filled[0].title, "백송마을5단지 503동");
  assert.ok(!JSON.stringify(r.sent).includes("010-1234"), "메시지에 전화번호 없음");
  assert.equal(r.sL, 0);
  assert.equal(r.dL, 0);
});

test("연결: 다른 계정이면 후보를 보내지 않음", async () => {
  const r = await link({ deskAcct: "ffffffffffffffff" });
  assert.deepEqual(r.results, ["mismatch"]);
  assert.equal(r.filled.length, 0);
  assert.equal(r.sent.length, 0);
});
