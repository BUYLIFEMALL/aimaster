// 맥미니 44a14fc42 재검수의 경합 반례(재개 경합 · 범위 재검사와 전송 사이 · 접수 기록 정리)를 그대로 옮긴 시험.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EngineError, createEngineClient } from "../src/lib/engine.ts";
import { findPreset } from "../src/lib/studio/presets.ts";
import { adoptDraft, buildPlan, discardUncertain, draftStatus, loadDraft, readDraft, remainingItems, saveDraft, submitRemaining } from "../src/lib/studio/batch.ts";
import { again, restart } from "../src/lib/studio/jobsView.ts";
import { crossTabLock, hasCrossTabLock, localLock } from "../src/lib/studio/lock.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const SESSION = `fis.engineToken.v1:${A}`;
const LEDGER = `fis.submissions.v1:${A}`;
const DRAFT = `fis.draft.v1:${A}`;
const kind = (k) => (e) => e instanceof EngineError && e.kind === k;
const isPost = (call) => call.method === "POST" && call.path === "/queue";
const posts = (engine) => engine.st.calls.filter(isPost);
const plan = (text, over = {}) => buildPlan({ text, preset: findPreset("photo"), width: 1280, height: 720, ...over }).items;
const THREE = "a red apple on a table\na blue bird on a branch\na green hill at dawn";
const idCount = (engine) => {
  const m = new Map();
  for (const p of posts(engine)) m.set(p.body.clientRequestId, (m.get(p.body.clientRequestId) ?? 0) + 1);
  return m;
};
/** 묶음을 「첫 장에 보내려 함 표시가 적힌」 상태로 되돌려 놓는다(다른 화면이 같은 묶음을 이어가는 순서를 만들 때) */
function saveDraftBack(storage, draft) {
  storage.map.set(DRAFT, JSON.stringify({ ...draft, items: draft.items.map((it, k) => (k === 0 ? { ...it, tried: Date.now() } : it)) }));
}
async function paired(engine, storage = memoryStorage()) {
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  await c.pair(engine.st.codes[0]);
  return { c, storage };
}
/** 같은 저장소에 「다른 탭이 새 범위로 연결한 뒤」의 연결 기록을 만들어 두고, 원래 기록으로 되돌린다. 돌려주는 값: [원래, 새것] */
async function twoSessions(engine, c, storage) {
  const s1 = storage.map.get(SESSION);
  const other = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  other.disconnect();
  await other.pair(engine.st.codes[0]);
  const s2 = storage.map.get(SESSION);
  storage.map.set(SESSION, s1);
  assert.notEqual(JSON.parse(s1).link, JSON.parse(s2).link);
  assert.equal(c.scopeId(), JSON.parse(s1).link);
  return [s1, s2];
}

test("반례 P2(재개 경합) — 두 화면이 같은 묶음을 동시에 이어 맡겨도 접수 번호마다 전송은 한 번", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan(`${THREE}\na small boat on a river x2`));
  const tab2 = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  // 응답을 조금 늦춰 두 화면의 진행이 서로 끼어들게 한다
  engine.st.hold = (call) => (isPost(call) ? new Promise((res) => setTimeout(res, 2)) : null);
  const [r1, r2] = await Promise.all([submitRemaining(c, storage), submitRemaining(tab2, storage)]);
  engine.st.hold = null;
  assert.equal(posts(engine).length, 5, "다섯 장에 전송 다섯 번");
  assert.deepEqual([...idCount(engine).values()], [1, 1, 1, 1, 1], "같은 접수 번호를 두 번 보내지 않았다");
  assert.deepEqual([...idCount(engine).keys()].sort(), draft.items.map((i) => i.requestId).sort());
  assert.equal(r1.sent + r2.sent, 5);
  assert.equal(r1.sent + r1.skipped + r2.sent + r2.skipped >= 5, true);
  assert.equal(engine.st.jobs.length, 5);
  assert.equal(readDraft(storage, A), null, "모두 맡겨 묶음을 비웠다");
  assert.equal(c.submissions().length, 5, "두 화면이 적은 접수 기록이 하나도 사라지지 않았다");
  // 세 화면이 한꺼번에 눌러도 마찬가지
  const e2 = createMockEngine();
  const p2 = await paired(e2);
  saveDraft(p2.storage, A, plan(THREE));
  const tabs = [p2.c, createEngineClient({ memberId: A, storage: p2.storage, fetch: e2.fetch }), createEngineClient({ memberId: A, storage: p2.storage, fetch: e2.fetch })];
  await Promise.all(tabs.map((t) => submitRemaining(t, p2.storage)));
  assert.deepEqual([...idCount(e2).values()], [1, 1, 1]);
});

test("맥미니가 주입한 순서 — 둘째 화면이 첫 접수 기록이 쓰이기 전의 접수 기록을 본 채 진행해도 같은 번호를 두 번 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan("a red apple on a table"));
  // 둘째 화면의 저장소 읽기: 접수 기록만 「첫 장을 맡기기 전」 내용으로 얼려 둔다(다른 것은 실제 저장소 그대로)
  const frozen = storage.map.get(LEDGER) ?? "[]";
  const staleView = { getItem: (k) => (k === LEDGER ? frozen : storage.getItem(k)), setItem: (k, v) => storage.setItem(k, v), removeItem: (k) => storage.removeItem(k) };
  const tab2 = createEngineClient({ memberId: A, storage: staleView, fetch: engine.fetch });
  assert.deepEqual(await submitRemaining(c, storage), { sent: 1, skipped: 0, remaining: 0 });
  saveDraftBack(storage, draft); // 첫 화면이 묶음을 비우기 전 상태로 되돌려 둘째 화면이 같은 묶음을 이어가게 한다
  assert.deepEqual(tab2.submissions(), [], "둘째 화면에는 접수 기록이 아직 안 보인다");
  const second = await submitRemaining(tab2, staleView);
  assert.equal(second.sent, 0, "묶음에 적힌 「보내려 함」 표시를 보고 보내지 않는다");
  assert.equal(posts(engine).length, 1, "같은 접수 번호의 전송은 한 번");
  assert.deepEqual([...idCount(engine).values()], [1]);
});

test("잠금 수단이 없는 브라우저에서는 묶음을 맡기지 않고 이유를 알린다", async () => {
  // 나) 탭 사이 잠금이 없는 브라우저(lock: null) — 한 장도 보내지 않고 이유를 돌려준다
  const e2 = createMockEngine();
  const p2 = await paired(e2);
  saveDraft(p2.storage, A, plan(THREE));
  const out = await submitRemaining(p2.c, p2.storage, { lock: null });
  assert.equal(out.sent, 0);
  assert.equal(out.remaining, 3);
  assert.equal(out.stopped.kind, "nolock");
  assert.match(out.stopped.message, /여러 탭이 같은 그림을 동시에 맡기는 것을 막을 수단이 없어/);
  assert.equal(posts(e2).length, 0);
  assert.equal(loadDraft(p2.storage, A).length, 3, "남은 장은 그대로");
  assert.ok(loadDraft(p2.storage, A).every((i) => i.tried === undefined));
  // 잠금을 주면(지원 브라우저) 그대로 이어 맡긴다
  assert.deepEqual(await submitRemaining(p2.c, p2.storage, { lock: localLock }), { sent: 3, skipped: 0, remaining: 0 });
});

test("탭 사이 잠금 판단: Web Locks가 있으면 그것을, 브라우저 탭인데 없으면 없음(null), 탭이 아닌 실행 환경은 같은 스크립트 잠금", async () => {
  const nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const doc = Object.getOwnPropertyDescriptor(globalThis, "document");
  const set = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  try {
    // 브라우저 탭 + Web Locks 있음
    const used = [];
    set("document", {});
    set("navigator", { locks: { request: (name, fn) => (used.push(name), fn()) } });
    assert.equal(hasCrossTabLock(), true);
    assert.equal(await crossTabLock()("fis.x", async () => 7), 7);
    assert.deepEqual(used, ["fis.x"]);
    // 브라우저 탭 + Web Locks 없음 → 수단 없음
    set("navigator", {});
    assert.equal(hasCrossTabLock(), false);
    assert.equal(crossTabLock(), null);
    // 그 상태에서 묶음 맡기기는 기본값만으로도 멈춘다
    const engine = createMockEngine();
    const { c, storage } = await paired(engine);
    saveDraft(storage, A, plan(THREE));
    const out = await submitRemaining(c, storage);
    assert.equal(out.stopped.kind, "nolock");
    assert.equal(posts(engine).length, 0);
    // 탭이 아닌 실행 환경(문서 없음) + Web Locks 없음 → 같은 스크립트 안의 잠금
    delete globalThis.document;
    assert.equal(crossTabLock(), localLock);
  } finally {
    if (nav) Object.defineProperty(globalThis, "navigator", nav);
    else delete globalThis.navigator;
    if (doc) Object.defineProperty(globalThis, "document", doc);
    else delete globalThis.document;
  }
});

test("반례 P2(범위 재검사와 전송 사이) — 범위를 확인한 직후 다른 탭이 새 연결을 적어도, 연결 계층이 기대 범위와 견줘 새 범위로 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan(THREE));
  const [s1, s2] = await twoSessions(engine, c, storage);
  // scopeId()가 옛 범위를 돌려준 **직후** 다른 탭의 새 연결 기록이 반영되는 순서
  let swapped = false;
  const racing = Object.assign(Object.create(c), {
    scopeId: () => {
      const v = c.scopeId();
      if (!swapped) {
        swapped = true;
        storage.map.set(SESSION, s2);
      }
      return v;
    },
  });
  const out = await submitRemaining(racing, storage);
  assert.equal(swapped, true);
  assert.equal(posts(engine).length, 0, "새 범위로 한 장도 보내지 않았다");
  assert.equal(out.sent, 0);
  assert.equal(out.stopped.kind, "scope");
  assert.equal(out.remaining, 3);
  assert.deepEqual(c.submissions(), [], "접수 기록도 만들지 않았다");
  assert.ok(loadDraft(storage, A).every((i) => i.tried === undefined), "보내려 한 표시를 되돌렸다(보낸 적 없는 장으로 남는다)");
  assert.deepEqual(loadDraft(storage, A).map((i) => i.requestId), draft.items.map((i) => i.requestId));
  assert.deepEqual(draftStatus(c, storage), { remaining: 0, otherScope: 3, legacy: 0, uncertain: 0 });
  // 연결 계층 단독: 기대 범위가 다르면 접수 기록·요청 모두 없음
  storage.map.set(SESSION, s1);
  await assert.rejects(c.submit({ title: "t", prompt: "a red apple on a table" }, { expectLink: JSON.parse(s2).link }), kind("stale"));
  assert.equal(posts(engine).length, 0);
  assert.deepEqual(c.submissions(), []);
  // 기대 범위가 같으면 보낸다
  assert.equal((await c.submit({ title: "t", prompt: "a red apple on a table" }, { expectLink: JSON.parse(s1).link })).state, "accepted");
});

test("범위를 견준 세션 그대로 보낸다 — 연결 기록을 읽은 뒤 요청이 나가기 전에 다른 탭이 연결을 바꿔도, 견준 그 토큰·그 범위로 간다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const [s1, s2] = await twoSessions(engine, c, storage);
  const old = JSON.parse(s1);
  // 요청이 나가는 순간(연결 계층이 연결 기록을 읽은 뒤)에 저장소의 연결 기록을 새것으로 바꾼다
  const swapOnSend = createEngineClient({
    memberId: A,
    storage,
    fetch: (url, init) => {
      if (init?.method === "POST" && String(url).endsWith("/queue")) storage.map.set(SESSION, s2);
      return engine.fetch(url, init);
    },
  });
  const r = await swapOnSend.submit({ title: "t", prompt: "a red apple on a table" }, { expectLink: old.link });
  const sent = posts(engine)[0];
  assert.equal(sent.auth, old.token, "저장소를 다시 읽지 않고, 범위를 견줄 때 읽은 토큰으로 보냈다");
  assert.equal(engine.st.jobs[0].scope, engine.st.tokens.find((t) => t.token === old.token).scope, "작업은 옛 범위에 들어갔다");
  assert.equal(swapOnSend.submissions()[0].link, old.link, "접수 기록의 범위 표시도 같은 범위");
  assert.equal(r.requestId, sent.body.clientRequestId);
  // 다시 보내기도 같은 방식 — 연결 기록을 한 번 읽어 견주고 그 토큰으로
  storage.map.set(SESSION, s1);
  const e2 = createMockEngine();
  const p2 = await paired(e2);
  e2.st.override = (call) => (isPost(call) ? new Response(JSON.stringify({ error: "잠시 뒤 다시 시도해 주세요." }), { status: 429 }) : null);
  const rej = await p2.c.submit({ title: "t", prompt: "a red apple on a table" });
  e2.st.override = null;
  const [t1, t2] = await twoSessions(e2, p2.c, p2.storage);
  const resender = createEngineClient({ memberId: A, storage: p2.storage, fetch: (url, init) => (init?.method === "POST" && String(url).endsWith("/queue") && p2.storage.map.set(SESSION, t2), e2.fetch(url, init)) });
  await resender.resend(rej.requestId);
  assert.equal(posts(e2).at(-1).auth, JSON.parse(t1).token);
});

test("한 장 동작(다시 시작·다시 만들기)도 확인한 범위를 연결 계층에 넘긴다 — 확인과 전송 사이에 연결이 바뀌면 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const failed = await c.submit({ title: "실패", prompt: "a red apple on a table", seed: 1 });
  const done = await c.submit({ title: "완료", prompt: "a blue bird on a branch", seed: 2 });
  engine.finish(failed.job.id, "failed");
  engine.finish(done.job.id);
  const [, s2] = await twoSessions(engine, c, storage);
  const seen = [];
  // 실행 직전 확인(목록 새로 읽기·범위 대조)은 통과한 뒤, 접수 직전에 다른 탭의 새 연결이 반영된다
  const racing = Object.assign(Object.create(c), {
    submit: (input, opts) => {
      seen.push(opts);
      storage.map.set(SESSION, s2);
      return c.submit(input, opts);
    },
  });
  const before = posts(engine).length;
  await assert.rejects(restart(racing, failed.requestId), kind("stale"));
  storage.map.set(SESSION, storage.map.get(SESSION) === s2 ? JSON.stringify({ ...JSON.parse(s2) }) : s2);
  assert.equal(posts(engine).length, before, "새 범위로 보내지 않았다");
  assert.equal(seen[0].expectLink, c.submissions().find((s) => s.requestId === failed.requestId).link, "확인한 범위를 넘겼다");
  assert.equal(c.submissions().length, 2, "새 접수 기록을 만들지 않았다");
  const src = await readFile(new URL("../src/lib/studio/jobsView.ts", import.meta.url), "utf8");
  assert.equal(src.split("{ expectLink: sub.link }").length - 1, 2, "다시 만들기·다시 시작 둘 다");
  assert.equal(src.split("locked(client, () => client.submit(").length - 1, 3, "새 접수를 만드는 세 동작 모두 접수 잠금 안에서");
  void again;
});

test("반례 P2(접수 기록 정리) — 접수 기록이 300건을 넘어 묶음의 첫 장 기록이 밀려나도, 그 장을 보낸 적 없는 장으로 보지 않는다. 새 범위로 옮길 때 새 번호를 주지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan("a red apple on a table\na blue bird on a branch"));
  let n = 0;
  await submitRemaining(c, storage, { shouldStop: () => n++ >= 1 }); // 첫 장만 맡김
  const firstId = draft.items[0].requestId;
  assert.equal((await c.confirm(firstId)).state, "accepted", "첫 장은 접수됨을 확인했다");
  assert.ok(loadDraft(storage, A)[0].tried > 0, "보내기 직전에 적은 표시가 묶음에 있다(접수 기록과 별도)");
  // 접수 기록에 끝난 기록 300개가 쌓이고, 새 접수 하나가 오래된 첫 장 기록을 밀어낸다
  const ledger = JSON.parse(storage.map.get(LEDGER));
  ledger[0].at = 1; // 가장 오래된 기록
  const link = ledger[0].link;
  for (let i = 0; i < 299; i++) ledger.push({ requestId: `fill-${String(i).padStart(8, "0")}`, trackId: "t", link, title: "채움", task: { prompt: "a b c" }, state: "accepted", jobId: "00000000-0000-4000-8000-000000000000", at: 1000 + i });
  storage.map.set(LEDGER, JSON.stringify(ledger));
  assert.equal(c.submissions().length, 300);
  await c.submit({ title: "다른 그림", prompt: "a small boat on a river", seed: 77 });
  assert.equal(c.submissions().length, 300, "300건으로 정리됐다");
  assert.equal(c.submissions().some((s) => s.requestId === firstId), false, "첫 장의 접수 기록이 밀려났다");
  // 그래도 첫 장은 「보낸 적 없는 장」이 아니다
  assert.deepEqual(remainingItems(c, storage).map((i) => i.line), [2]);
  assert.deepEqual(draftStatus(c, storage), { remaining: 1, otherScope: 0, legacy: 0, uncertain: 1 });
  const before = posts(engine).length;
  const run = await submitRemaining(c, storage);
  assert.deepEqual([run.sent, run.skipped, run.remaining], [1, 1, 0], "둘째 장만 보냈다");
  assert.equal(posts(engine).filter((p) => p.body.clientRequestId === firstId).length, 1, "첫 장을 다시 보내지 않았다");
  assert.equal(posts(engine).length, before + 1);
  assert.ok(readDraft(storage, A), "받았는지 모르는 장이 남아 있어 묶음을 지우지 않는다");
  // 다른 범위에서 「새로 맡기기」를 확인해도 첫 장에 새 접수 번호를 주지 않는다
  c.disconnect();
  await c.pair(engine.st.codes[0]);
  saveDraft; // (새 묶음을 만들지 않는다 — 기존 묶음 그대로)
  assert.deepEqual(draftStatus(c, storage), { remaining: 0, otherScope: 0, legacy: 0, uncertain: 1 });
  assert.throws(() => adoptDraft(c, storage, true), (e) => kind("invalid")(e) && /받았는지 알 수 없는 그림이 1장/.test(e.message));
  assert.equal(posts(engine).filter((p) => p.body.task.prompt === draft.items[0].prompt).length, 1, "첫 장의 그림은 한 번만 맡겨졌다");
  // 사용자가 확인하고 정리해야만 묶음에서 빠진다
  assert.throws(() => discardUncertain(c, storage, false), kind("invalid"));
  assert.equal(discardUncertain(c, storage, true), 1);
  assert.equal(readDraft(storage, A), null);
});

test("연결이 바뀐 묶음을 옮길 때: 보낸 적 없는 장만 새 번호를 받고, 받았는지 모르는 장이 있으면 먼저 정리하게 한다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan(THREE));
  // 첫 장: 접수됨. 둘째 장: 보내려 한 표시만 있고 접수 기록이 없음(보내는 도중 화면이 닫힘). 셋째 장: 보낸 적 없음
  let n = 0;
  await submitRemaining(c, storage, { shouldStop: () => n++ >= 1 });
  const d = JSON.parse(storage.map.get(DRAFT));
  d.items[1].tried = Date.now();
  storage.map.set(DRAFT, JSON.stringify(d));
  assert.deepEqual(draftStatus(c, storage), { remaining: 1, otherScope: 0, legacy: 0, uncertain: 1 });
  // 같은 범위에서 이어 맡기기: 둘째 장은 건너뛰고(다시 보내지 않음) 셋째 장만
  const run = await submitRemaining(c, storage);
  assert.deepEqual([run.sent, run.skipped, run.remaining], [1, 2, 0]);
  assert.equal(posts(engine).filter((p) => p.body.clientRequestId === draft.items[1].requestId).length, 0, "중간에 끊긴 장을 자동으로 다시 보내지 않았다");
  assert.equal(posts(engine).length, 2);
  // 새 범위
  c.disconnect();
  await c.pair(engine.st.codes[0]);
  assert.deepEqual(draftStatus(c, storage), { remaining: 0, otherScope: 0, legacy: 0, uncertain: 1 });
  assert.throws(() => adoptDraft(c, storage, true), kind("invalid"));
  assert.equal(discardUncertain(c, storage, true), 1);
  assert.equal(adoptDraft(c, storage, true), null, "옮길 장이 없다");
  assert.equal(posts(engine).length, 2);
});

test("반례(접수 기록 저장 실패) — 접수 기록을 적지 못하면 보내지 않고, 보내려 한 표시도 되돌린다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  saveDraft(storage, A, plan(THREE));
  storage.failSet = (k) => k === LEDGER;
  const out = await submitRemaining(c, storage);
  storage.failSet = null;
  assert.equal(out.stopped.kind, "storage");
  assert.equal(out.sent, 0);
  assert.equal(out.remaining, 3);
  assert.equal(posts(engine).length, 0);
  assert.ok(loadDraft(storage, A).every((i) => i.tried === undefined), "보낸 적 없는 장으로 남는다");
  assert.deepEqual(draftStatus(c, storage), { remaining: 3, otherScope: 0, legacy: 0, uncertain: 0 });
  // 저장이 풀리면 같은 접수 번호로 이어 맡긴다
  const ids = loadDraft(storage, A).map((i) => i.requestId);
  assert.deepEqual(await submitRemaining(c, storage), { sent: 3, skipped: 0, remaining: 0 });
  assert.deepEqual(posts(engine).map((p) => p.body.clientRequestId), ids);
  // 묶음에 「보내려 함」 표시를 적지 못해도 보내지 않는다
  const e2 = createMockEngine();
  const p2 = await paired(e2);
  saveDraft(p2.storage, A, plan(THREE));
  p2.storage.failSet = (k) => k === DRAFT;
  const out2 = await submitRemaining(p2.c, p2.storage);
  p2.storage.failSet = null;
  assert.equal(out2.stopped.kind, "storage");
  assert.equal(posts(e2).length, 0);
  assert.deepEqual(p2.c.submissions(), []);
});

test("반례(중간 종료) — 보내려 한 표시를 적은 직후 화면이 닫힌 장은 받았는지 모르는 장으로 남고, 다시 열어도 자동으로 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan(THREE));
  // 첫 장: 표시를 적은 뒤, 접수 기록을 적기 전에 화면이 닫힘(접수 기록 쓰기에서 예외가 아닌 강제 종료를 흉내 — 표시만 남긴다)
  const d = JSON.parse(storage.map.get(DRAFT));
  d.items[0].tried = Date.now();
  storage.map.set(DRAFT, JSON.stringify(d));
  // 새 화면
  const c2 = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  assert.deepEqual(draftStatus(c2, storage), { remaining: 2, otherScope: 0, legacy: 0, uncertain: 1 });
  const run = await submitRemaining(c2, storage);
  assert.deepEqual([run.sent, run.skipped, run.remaining], [2, 1, 0]);
  assert.equal(posts(engine).some((p) => p.body.clientRequestId === draft.items[0].requestId), false, "끊긴 장을 보내지 않았다");
  assert.equal(loadDraft(storage, A).length, 3, "묶음을 지우지 않았다(받았는지 모르는 장이 남아 있다)");
  // 여러 번 다시 열어 눌러도 그대로
  for (let i = 0; i < 3; i++) assert.equal((await submitRemaining(createEngineClient({ memberId: A, storage, fetch: engine.fetch }), storage)).sent, 0);
  assert.equal(posts(engine).length, 2);
  // 응답만 잃은 경우(접수 기록이 있음)는 「받았는지 모름」이 접수 기록 쪽에 남는다 — 역시 다시 보내지 않는다
  const e3 = createMockEngine();
  const p3 = await paired(e3);
  saveDraft(p3.storage, A, plan(THREE));
  e3.st.loseResponse = isPost;
  const lost = await submitRemaining(p3.c, p3.storage);
  e3.st.loseResponse = null;
  assert.equal(lost.stopped.kind, "offline");
  assert.equal(p3.c.submissions()[0].state, "unknown");
  assert.deepEqual(draftStatus(p3.c, p3.storage), { remaining: 2, otherScope: 0, legacy: 0, uncertain: 0 });
  assert.deepEqual(await submitRemaining(p3.c, p3.storage), { sent: 2, skipped: 1, remaining: 0 });
  assert.deepEqual([...idCount(e3).values()], [1, 1, 1]);
});
