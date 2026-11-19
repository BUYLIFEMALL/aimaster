// 맥미니 4f677ea97 재검수: 전송 뒤 접수 기록 유실 + 화면 종료, 접수 기록 갱신의 조정 경계.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EngineError, createEngineClient } from "../src/lib/engine.ts";
import { findPreset } from "../src/lib/studio/presets.ts";
import { adoptDraft, buildPlan, confirmUncertain, discardUncertain, draftStatus, loadDraft, readDraft, saveDraft, submitRemaining } from "../src/lib/studio/batch.ts";
import { localLock } from "../src/lib/studio/lock.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const LEDGER = `fis.submissions.v1:${A}`;
const DRAFT = `fis.draft.v1:${A}`;
const kind = (k) => (e) => e instanceof EngineError && e.kind === k;
const isPost = (call) => call.method === "POST" && call.path === "/queue";
const posts = (engine) => engine.st.calls.filter(isPost);
const plan = (text) => buildPlan({ text, preset: findPreset("photo"), width: 1280, height: 720 }).items;
const TWO = "a red apple on a table\na blue bird on a branch";
async function paired(engine, storage = memoryStorage(), extra = {}) {
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch, ...extra });
  await c.pair(engine.st.codes[0]);
  return { c, storage };
}

test("반례 P2 — 전송 뒤 접수 기록이 사라지고 화면까지 닫혀도 「보내려 함」 표시는 남는다. 다른 연결에서 새로 맡겨도 그 그림을 다시 그리지 않는다", async () => {
  const engine = createMockEngine();
  const { c: b, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan(TWO));
  const firstId = draft.items[0].requestId;
  // B 화면: 엔진이 첫 장을 받은 뒤, 응답이 오기 직전에 (1) 다른 화면의 옛 내용 쓰기로 접수 기록이 사라지고 (2) 화면이 닫힌다
  let open;
  const gate = new Promise((res) => (open = res));
  engine.st.hold = (call) => (isPost(call) ? gate : null);
  const run = submitRemaining(b, storage);
  await new Promise((res) => setTimeout(res, 10));
  assert.equal(posts(engine).length, 1);
  assert.equal(engine.st.jobs.length, 1, "엔진은 이미 받았다");
  storage.map.set(LEDGER, "[]"); // 접수 기록 유실
  b.dispose(); // 화면 종료
  open();
  engine.st.hold = null;
  const out = await run;
  assert.equal(out.stopped.kind, "scope", "연결이 끊긴 것으로 멈춘다");
  assert.equal(out.sent, 0);
  // 핵심: 접수 기록에 없지만 표시는 남아 있다
  assert.equal(JSON.parse(storage.map.get(LEDGER)).some((s) => s.requestId === firstId), false);
  assert.ok(loadDraft(storage, A)[0].tried > 0, "요청을 시작한 뒤의 실패에서는 표시를 지우지 않는다");
  const fresh = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  assert.deepEqual(draftStatus(fresh, storage), { remaining: 1, otherScope: 0, legacy: 0, uncertain: 1 });
  // 같은 연결에서 이어 맡겨도 첫 장은 다시 보내지 않는다
  const again = await submitRemaining(fresh, storage);
  assert.deepEqual([again.sent, again.skipped], [1, 1]);
  assert.equal(posts(engine).filter((p) => p.body.clientRequestId === firstId).length, 1);
  // 다른 연결에서 사용자가 「새로 맡기기」를 확인해도 첫 장은 옮겨지지 않는다
  fresh.disconnect();
  await fresh.pair(engine.st.codes[0]);
  assert.throws(() => adoptDraft(fresh, storage, true), kind("invalid"));
  assert.equal(engine.st.jobs.filter((j) => j.task.prompt === draft.items[0].prompt).length, 1, "같은 그림의 작업은 하나뿐");
  assert.equal(posts(engine).length, 2);
});

test("표시를 지우는 것은 연결 계층이 「요청을 시작하지 않았다」고 명시한 오류에서만", async () => {
  // 시작 전 거절: 표시가 붙는다
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const before = async (act) => {
    const e = await act().then(() => null, (x) => x);
    assert.ok(e instanceof EngineError, "오류가 나야 한다");
    return e.beforeSend;
  };
  const ok = { title: "t", prompt: "a red apple on a table" };
  assert.equal(await before(() => c.submit({ title: "t", prompt: "한글 설명" })), true, "입력 검사");
  assert.equal(await before(() => c.submit(ok, { expectLink: "other-link" })), true, "기대 범위 불일치");
  assert.equal(await before(() => c.submit(ok, { requestId: "bad id" })), true, "접수 번호 형식");
  storage.failSet = (k) => k === LEDGER;
  assert.equal(await before(() => c.submit(ok)), true, "접수 기록을 적지 못함");
  storage.failSet = null;
  const done = await c.submit(ok, { requestId: "taken-request-0001" });
  assert.equal(done.state, "accepted");
  assert.equal(await before(() => c.submit(ok, { requestId: "taken-request-0001" })), true, "이미 있는 접수 번호");
  const n = posts(engine).length;
  c.dispose();
  assert.equal(await before(() => c.submit(ok)), true, "닫힌 화면 — 요청을 보내지 않음");
  assert.equal(posts(engine).length, n);
  const lone = createEngineClient({ memberId: A, storage: memoryStorage(), fetch: engine.fetch });
  assert.equal(await before(() => lone.submit(ok)), true, "연결 없음");
  assert.equal(posts(engine).length, n, "위 경우들에서는 엔진에 아무것도 보내지 않았다");

  // 시작한 뒤: 표시가 없다 — 요청이 나간 뒤 화면이 닫힘
  const e2 = createMockEngine();
  const p2 = await paired(e2);
  let open;
  const gate = new Promise((res) => (open = res));
  e2.st.hold = (call) => (isPost(call) ? gate : null);
  const pending = p2.c.submit(ok).then(() => null, (x) => x);
  await new Promise((res) => setTimeout(res, 10));
  p2.c.dispose();
  open();
  const late = await pending;
  assert.ok(kind("stale")(late));
  assert.equal(late.beforeSend, false, "요청이 나간 뒤의 오류에는 표시가 없다");
  assert.equal(e2.st.jobs.length, 1);

  // 묶음에서: 시작 전 거절이면 표시 원복, 시작 뒤 실패면 표시 유지
  const e3 = createMockEngine();
  const p3 = await paired(e3);
  saveDraft(p3.storage, A, plan(TWO));
  p3.storage.failSet = (k) => k === LEDGER;
  await submitRemaining(p3.c, p3.storage);
  p3.storage.failSet = null;
  assert.ok(loadDraft(p3.storage, A).every((i) => i.tried === undefined), "시작 전 거절 → 보낸 적 없는 장");
  e3.st.loseResponse = isPost;
  await submitRemaining(p3.c, p3.storage);
  e3.st.loseResponse = null;
  assert.ok(loadDraft(p3.storage, A)[0].tried > 0, "시작 뒤 응답 유실 → 표시 유지");
  const src = await readFile(new URL("../src/lib/studio/batch.ts", import.meta.url), "utf8");
  assert.ok(src.includes("if (err.beforeSend === true) {"));
  assert.ok(!/if \(!client\.submissions\(\)\.some\(\(s\) => s\.requestId === item\.requestId\)\) \{\s*try \{\s*mark\(undefined\)/.test(src), "접수 기록에 없다는 이유로 표시를 지우지 않는다");
});

test("받았는지 모르는 장의 확인: 같은 접수 번호가 그 연결 범위의 목록에 있을 때만 접수됨으로 되찾는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan(TWO));
  await submitRemaining(c, storage);
  // 두 장 모두 맡긴 뒤 접수 기록이 사라진 상황을 만든다(묶음과 표시는 남김)
  storage.map.set(DRAFT, JSON.stringify({ ...draft, items: draft.items.map((i) => ({ ...i, tried: Date.now() })) }));
  storage.map.set(LEDGER, "[]");
  assert.deepEqual(draftStatus(c, storage), { remaining: 0, otherScope: 0, legacy: 0, uncertain: 2 });
  // 엔진 목록에 첫 장만 남아 있다(둘째 장은 그린 뒤 지워짐)
  const kept = engine.st.jobs;
  engine.st.jobs = kept.slice(0, 1);
  const n = posts(engine).length;
  assert.deepEqual(await confirmUncertain(c, storage), { checked: 2, recovered: 1 });
  assert.equal(posts(engine).length, n, "확인은 엔진에 새 작업을 만들지 않는다");
  const back = c.submissions();
  assert.deepEqual(back.map((s) => [s.requestId, s.state, s.jobId]), [[draft.items[0].requestId, "accepted", kept[0].id]]);
  assert.equal(back[0].link, draft.link);
  assert.equal(back[0].tag, `batch:${draft.batchId}:${draft.items[0].key}`);
  assert.deepEqual(draftStatus(c, storage), { remaining: 0, otherScope: 0, legacy: 0, uncertain: 1 }, "찾지 못한 장은 받았는지 모르는 장으로 남는다(받지 않았다고 단정하지 않는다)");
  // 목록이 온전하지 않으면 아무것도 되찾지 않는다
  engine.st.override = (call) => (call.method === "GET" && call.path === "/queue" ? new Response(JSON.stringify({ jobs: [{ id: "x" }] }), { status: 200 }) : null);
  await assert.rejects(confirmUncertain(c, storage), kind("error"));
  engine.st.override = null;
  // 접수 번호가 다른 작업(내용이 같아도)은 근거가 아니다
  engine.st.jobs = [{ ...kept[1], clientRequestId: "someone-else-0001" }];
  assert.deepEqual(await confirmUncertain(c, storage), { checked: 1, recovered: 0 });
  // 다른 연결 범위에서는 묻지도 않는다
  engine.st.jobs = kept;
  c.disconnect();
  await c.pair(engine.st.codes[0]);
  const calls = engine.st.calls.length;
  assert.deepEqual(await confirmUncertain(c, storage), { checked: 0, recovered: 0, reason: "otherScope" });
  assert.equal(engine.st.calls.length, calls);
  // 연결 계층 단독: 기대 범위가 다르면 묻지 않고, 번호 형식이 이상하면 거절
  assert.deepEqual(await c.recover(draft.items[1].requestId, { title: "t", prompt: "a blue bird on a branch" }, { expectLink: draft.link }), { state: "unknown", reason: "otherScope" });
  await assert.rejects(c.recover("bad id", { title: "t", prompt: "a blue bird on a branch" }, { expectLink: c.scopeId() }), kind("invalid"));
  assert.equal(discardUncertain(c, storage, true), 1);
  assert.equal(readDraft(storage, A), null);
});

test("접수 기록 갱신의 조정 경계 — 한 화면이 접수 기록을 읽고 쓰는 사이 다른 화면의 접수가 끼어들어도 서로의 기록을 덮지 않는다", async () => {
  // 저장소를 감싸, A가 접수 기록을 「읽은 직후」(쓰기 전)에 B의 접수를 끼워 넣는다
  const run = async (lock) => {
    const engine = createMockEngine();
    const storage = memoryStorage();
    // skip: 그 전에 건너뛸 읽기 수 — 다시 확인은 먼저 잠금 밖에서 한 번 읽고(대상 찾기), 그다음 잠금 안에서 읽고 고쳐 쓴다
    const hooked = { hook: null, skip: 0, getItem: (k) => { const v = storage.getItem(k); const h = hooked.hook; if (k === LEDGER && h) { if (hooked.skip > 0) hooked.skip -= 1; else { hooked.hook = null; h(); } } return v; }, setItem: (k, v) => storage.setItem(k, v), removeItem: (k) => storage.removeItem(k) };
    const a = createEngineClient({ memberId: A, storage: hooked, fetch: engine.fetch, ...(lock ? { lock } : {}) });
    await a.pair(engine.st.codes[0]);
    const b = createEngineClient({ memberId: A, storage, fetch: engine.fetch, ...(lock ? { lock } : {}) });
    const first = await a.submit({ title: "첫째", prompt: "a red apple on a table", seed: 1 });
    // A가 다음 접수 기록 갱신(다시 확인)을 위해 읽는 순간, B가 새 접수를 시작한다
    let bDone;
    hooked.skip = 1;
    hooked.hook = () => (bDone = b.submit({ title: "둘째", prompt: "a blue bird on a branch", seed: 2 }));
    engine.st.jobs.find((j) => j.id === first.job.id).status = "done";
    await a.confirm(first.requestId); // 접수 기록을 읽고(여기서 B가 끼어든다) 고쳐 쓴다
    const second = await bDone;
    return { titles: JSON.parse(storage.map.get(LEDGER)).map((s) => s.title).sort(), second, jobs: engine.st.jobs.length };
  };
  // 조정 경계가 있을 때(기본 잠금, 같은 스크립트 잠금 모두): 두 접수 기록이 모두 남는다
  for (const lock of [undefined, localLock]) {
    const out = await run(lock);
    assert.deepEqual(out.titles, ["둘째", "첫째"], "두 접수 기록 모두 남는다");
    assert.equal(out.second.state, "accepted");
    assert.equal(out.jobs, 2);
  }
  // 경계가 없으면(잠금이 아무 일도 하지 않으면) 실제로 B의 기록이 A의 옛 내용 쓰기에 덮인다 — 이 시험이 그 틈을 재현한다는 대조
  const broken = await run((_name, fn) => fn());
  assert.deepEqual(broken.titles, ["첫째"], "잠금이 없으면 둘째 접수 기록이 사라진다(엔진에는 작업이 있다)");
  assert.equal(broken.jobs, 2);
});

test("접수 기록을 고쳐 쓰는 길은 하나 — 잠금 안에서 다시 읽고 쓴다. 다시 들어가지 않는다(멈춤 없음)", async () => {
  const src = await readFile(new URL("../src/lib/engine.ts", import.meta.url), "utf8");
  // 저장소에 접수 기록을 쓰는 곳은 writeLedger 한 곳, writeLedger를 부르는 곳은 mutate 한 곳
  // 쓰는 곳은 둘: 평소의 writeLedger, 그리고 손상된 기록을 옮기고 빈 기록으로 다시 시작하는 setAsideBrokenLedger(손상됐을 때만, 사용자 확인 뒤).
  assert.equal(src.split("storage.setItem(ledgerKey,").length - 1, 2);
  assert.ok(src.includes('storage.setItem(ledgerKey, "[]");'));
  assert.equal(src.split("writeLedger(").length - 1, 2, "정의 1 + mutate 안의 호출 1");
  assert.ok(src.includes("if (out.list) writeLedger(out.list);"));
  assert.ok(src.includes("return ledgerLock(ledgerLockName, async () => {"));
  assert.equal(src.split("ledgerLock(ledgerLockName").length - 1, 2, "잠금을 잡는 곳은 mutate와 손상 기록 옮기기 둘뿐");
  // mutate에 넘기는 계산 안에서는 접수 기록을 고치는 함수(mutate·patch·settle)나 await를 쓰지 않는다
  const bodies = [...src.matchAll(/mutate\(\(list\) => \{([\s\S]*?)\n {6,8}\}\);/g)].map((m) => m[1]);
  assert.ok(bodies.length >= 4, `mutate 사용처 ${bodies.length}곳`);
  for (const body of bodies) assert.ok(!/\b(mutate|patch|settle)\(|\bawait\b/.test(body), "잠금 안에서 다시 잠금을 잡지 않는다");
  // 다시 들어갈 수 없는 잠금으로도 모든 동작이 끝난다(멈추지 않는다)
  const held = new Set();
  const strict = async (name, fn) => {
    assert.equal(held.has(name), false, `${name} 잠금을 잡은 채 다시 잡으려 했다`);
    held.add(name);
    try {
      return await fn();
    } finally {
      held.delete(name);
    }
  };
  const engine = createMockEngine();
  const storage = memoryStorage();
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch, lock: strict });
  await c.pair(engine.st.codes[0]);
  const r = await c.submit({ title: "t", prompt: "a red apple on a table", seed: 1 });
  await c.confirm(r.requestId);
  engine.st.override = (call) => (isPost(call) ? new Response(JSON.stringify({ error: "잠시 뒤 다시 시도해 주세요." }), { status: 429 }) : null);
  const rej = await c.submit({ title: "t2", prompt: "a blue bird on a branch", seed: 2 });
  engine.st.override = null;
  await c.resend(rej.requestId);
  engine.st.loseResponse = isPost;
  const lost = await c.submit({ title: "t3", prompt: "a green hill at dawn", seed: 3 });
  engine.st.loseResponse = null;
  assert.equal(await c.forget(lost.requestId, { force: true }), true);
  await c.recover(lost.requestId, { title: "t3", prompt: "a green hill at dawn", seed: 3 }, { expectLink: c.scopeId() });
  saveDraft(storage, A, plan(TWO));
  assert.deepEqual(await submitRemaining(c, storage, { lock: strict }), { sent: 2, skipped: 0, remaining: 0 });
  assert.equal(held.size, 0);
  assert.equal(c.submissions().length, 5);
});
