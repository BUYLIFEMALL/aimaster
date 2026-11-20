// C-1(2026-11-20): 매물 알림 → 고객관리 후보 보내기(A6 계약) — 화이트리스트·단계·기한·계정 비교
import { test } from "node:test";
import assert from "node:assert/strict";
import { DESK_ORIGIN, DESK_URL, HANDOFF_MS, buildDeskFields, manwon, startDeskSend, type MsgEvent, type SendResult } from "../lib/deskCandidate.ts";

const COLUMNS = ["단지명", "동", "거래 종류", "가격(만 원)", "전용면적(㎡)", "층", "방향", "매물 특징", "확인일", "중개사 상호", "사무실 번호", "휴대폰", "상태", "이전 가격", "실거래 대비", "첫 발견일", "네이버 매물 주소", "급매"];
const ROW = ["백송마을5단지", "503동", "매매", "4억 2,000", "84.9", "12/25", "남향", "올수리 급매 010-1234-5678 연락", "26.11.19", "행복공인중개사", "031-905-1234", "010-9876-5432", "신규", "", "+3%", "2026-11-19", "https://new.land.naver.com/complexes/1?articleNo=2512345678", "급매"];
const flush = () => new Promise((r) => setImmediate(r));

test("화이트리스트 칸만 — 중개사·전화번호·특징·매물 주소·번호 없음", () => {
  const f = buildDeskFields(COLUMNS, ROW)!;
  assert.deepEqual(Object.keys(f).sort(), ["address", "area", "dealType", "direction", "floorInfo", "monthly", "price", "title"]);
  assert.deepEqual(f, { title: "백송마을5단지 503동", address: "백송마을5단지", dealType: "매매", price: 42000, monthly: null, area: 84.9, floorInfo: "12/25", direction: "남향" });
  const json = JSON.stringify(f);
  for (const bad of ["010", "031-905", "행복공인", "올수리", "naver", "2512345678"]) assert.ok(!json.includes(bad), bad);
});

test("월세는 보증금/월세 나눔, 그 밖 거래는 비움, 단지명 없으면 보내지 않음", () => {
  const rent = buildDeskFields(COLUMNS, ["A단지", "", "월세", "5,000 / 120", "", "", "", "", "", "", "", "", "신규"])!;
  assert.equal(rent.dealType, "월세");
  assert.equal(rent.price, 5000);
  assert.equal(rent.monthly, 120);
  assert.equal(rent.area, null);
  const short = buildDeskFields(COLUMNS, ["A단지", "", "단기임대", "3억", "", "", "", "", "", "", "", "", "신규"])!;
  assert.equal(short.dealType, "");
  assert.equal(short.monthly, null);
  assert.equal(buildDeskFields(COLUMNS, ["", "101동", "매매", "3억"]), null);
  assert.equal(buildDeskFields(COLUMNS, ["010-1234-5678", "", "매매", "3억"]), null);
  assert.equal(manwon("3억"), 30000);
  assert.equal(manwon("가격 문의"), null);
});

// ── 가짜 창·타이머로 단계 시험 ──
function harness(opts: { acct?: string | null; blocked?: boolean } = {}) {
  let t = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  let nextTimer = 1;
  const listeners = new Set<(e: MsgEvent) => void>();
  const posted: { data: any; origin: string }[] = [];
  const results: SendResult[] = [];
  const win = { postMessage: (data: unknown, origin: string) => posted.push({ data, origin }) };
  let opened: string | null = null;
  let ids = 0;
  const stop = startDeskSend(buildDeskFields(COLUMNS, ROW)!, {
    open: (url) => { opened = url; return opts.blocked ? null : win; },
    listen: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    setTimer: (fn, ms) => { const id = nextTimer++; timers.set(id, { at: t + ms, fn }); return id; },
    clearTimer: (id) => timers.delete(id as number),
    now: () => t,
    newId: () => `id-0000000${++ids}`,
    getAcct: async () => (opts.acct === undefined ? "0123456789abcdef" : opts.acct),
    notify: (r) => results.push(r),
  });
  const deliver = (e: MsgEvent) => [...listeners].forEach((fn) => fn(e));
  const advance = (ms: number) => {
    t += ms;
    for (const [id, tm] of [...timers]) if (tm.at <= t) { timers.delete(id); tm.fn(); }
  };
  return { win, posted, results, listeners, timers, deliver, advance, stop, opened: () => opened };
}
const ready = (readyId = "ready-00000001", acct = "0123456789abcdef") => ({ v: 1, type: "desk-ready", readyId, acct });

test("정상 흐름: 리스너 → 창 열기 → READY → 후보 1회(정확한 주소) → ACK → 정리", async () => {
  const h = harness();
  assert.equal(h.opened(), DESK_URL);
  assert.ok(!DESK_URL.includes("price") && !DESK_URL.includes("title"), "값은 주소에 없음");
  h.deliver({ origin: "https://evil.example", source: h.win, data: ready() }); // 다른 출처 무시
  h.deliver({ origin: DESK_ORIGIN, source: {}, data: ready() }); // 다른 창 무시
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: ready() });
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: ready("ready-00000002") }); // 두 번째 READY 무시
  await flush();
  assert.equal(h.posted.length, 1);
  const msg = h.posted[0];
  assert.equal(msg.origin, DESK_ORIGIN);
  assert.equal(msg.data.type, "desk-candidate");
  assert.equal(msg.data.readyId, "ready-00000001");
  assert.equal(msg.data.acct, "0123456789abcdef");
  assert.equal(msg.data.fields.title, "백송마을5단지 503동");
  const requestId = msg.data.requestId;
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: { v: 1, type: "desk-filled", readyId: "ready-00000001", requestId: "wrong-0000001", ok: true } }); // 다른 requestId 무시
  assert.deepEqual(h.results, []);
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: { v: 1, type: "desk-filled", readyId: "ready-00000001", requestId, ok: true } });
  assert.deepEqual(h.results, ["filled"]);
  assert.equal(h.listeners.size, 0, "리스너 해제");
  assert.equal(h.timers.size, 0, "타이머 해제");
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: { v: 1, type: "desk-filled", readyId: "ready-00000001", requestId, ok: false } });
  assert.deepEqual(h.results, ["filled"], "끝난 뒤 ACK 무시");
});

test("READY 뒤 리스너는 ACK까지 유지, 타이머 A→B로 바뀜", async () => {
  const h = harness();
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: ready() });
  await flush();
  assert.equal(h.listeners.size, 1);
  assert.equal(h.timers.size, 1);
  h.advance(HANDOFF_MS + 1);
  assert.deepEqual(h.results, ["timeoutAck"]);
  assert.equal(h.listeners.size, 0);
});

test("계정 불일치: 출처·창·기한 확인 뒤 불일치 안내, 후보 보내지 않음", async () => {
  const h = harness();
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: ready("ready-00000001", "ffffffffffffffff") });
  await flush();
  assert.equal(h.posted.length, 0);
  assert.deepEqual(h.results, ["mismatch"]);
  assert.equal(h.listeners.size, 0);
});

test("계정값을 못 받으면 보내지 않음", async () => {
  const h = harness({ acct: null });
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: ready() });
  await flush();
  assert.equal(h.posted.length, 0);
  assert.deepEqual(h.results, ["noAcct"]);
});

test("READY가 15초 안에 안 오면 끝, 늦은 READY 무시", async () => {
  const h = harness();
  h.advance(HANDOFF_MS + 1);
  assert.deepEqual(h.results, ["timeoutReady"]);
  h.deliver({ origin: DESK_ORIGIN, source: h.win, data: ready() });
  await flush();
  assert.equal(h.posted.length, 0);
});

test("팝업 막힘·화면 떠남 정리", async () => {
  const b = harness({ blocked: true });
  assert.deepEqual(b.results, ["blocked"]);
  assert.equal(b.listeners.size, 0);
  const h = harness();
  h.stop();
  assert.equal(h.listeners.size, 0);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.results, [], "떠날 때는 안내 없음");
});
