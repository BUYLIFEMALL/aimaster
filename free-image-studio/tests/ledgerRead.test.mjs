// 맥미니 706b1d53d 재검수: 접수 기록을 「읽지 못함」과 「없음」의 구분, 되찾기 결과와 접수 기록의 일치.
import test from "node:test";
import assert from "node:assert/strict";
import { EngineError, createEngineClient, isSubmissionRow } from "../src/lib/engine.ts";
import { buildRows } from "../src/lib/studio/jobsView.ts";
import { findPreset } from "../src/lib/studio/presets.ts";
import { buildPlan, confirmUncertain, draftStatus, loadDraft, saveDraft, submitRemaining } from "../src/lib/studio/batch.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const LEDGER = `fis.submissions.v1:${A}`;
const DRAFT = `fis.draft.v1:${A}`;
const isPost = (call) => call.method === "POST" && call.path === "/queue";
const posts = (engine) => engine.st.calls.filter(isPost);
const plan = (text) => buildPlan({ text, preset: findPreset("photo"), width: 1280, height: 720 }).items;
const OK = { title: "t", prompt: "a red apple on a table" };
const ROW = (requestId, over = {}) => ({ requestId, trackId: "t", link: "some-link", title: "줄", task: { prompt: "a b c" }, state: "accepted", jobId: "00000000-0000-4000-8000-000000000000", at: 1, ...over });
const BUILD = (c, subs) => buildRows(subs, [], { inScope: (id) => c.inCurrentScope(id), canResend: (id) => c.canResend(id) });
const caught = (p) => p.then(() => null, (e) => e);
/** 접수 기록 칸의 읽기를 실패시킬 수 있는 저장소. failGet: 남은 실패 횟수(Infinity면 계속) */
function flaky() {
  const base = memoryStorage();
  const s = { base, map: base.map, failGet: 0, getItem: (k) => { if (k === LEDGER && s.failGet > 0) { s.failGet -= 1; throw new DOMException("read", "SecurityError"); } return base.getItem(k); }, setItem: (k, v) => base.setItem(k, v), removeItem: (k) => base.removeItem(k) };
  return s;
}
async function paired(engine, storage) {
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  await c.pair(engine.st.codes[0]);
  return c;
}

test("반례 P2 — 접수 기록 읽기가 한 번 실패해도 빈 기록으로 여기지 않는다: 기존 기록 불변, 전송 0, 자동 재시도 0", async () => {
  const engine = createMockEngine();
  const storage = flaky();
  const c = await paired(engine, storage);
  const first = await c.submit(OK, { requestId: "fixed-request-0001" });
  assert.equal(first.state, "accepted");
  const before = storage.map.get(LEDGER);
  const n = posts(engine).length;
  const gets = () => engine.st.calls.length;
  // 새 접수: 읽기 실패 → 쓰지 않고 보내지 않는다
  storage.failGet = 1;
  const e1 = await caught(c.submit({ title: "새 그림", prompt: "a blue bird on a branch" }));
  assert.ok(e1 instanceof EngineError && e1.kind === "storage" && e1.beforeSend === true);
  assert.equal(storage.map.get(LEDGER), before, "기존 접수 기록은 그대로");
  assert.equal(posts(engine).length, n);
  // 이미 기록된 접수 번호를 지정: 읽기 실패로 중복 확인을 건너뛰지 않는다
  storage.failGet = 1;
  const e2 = await caught(c.submit(OK, { requestId: "fixed-request-0001" }));
  assert.ok(e2 instanceof EngineError && e2.kind === "storage" && e2.beforeSend === true);
  assert.equal(posts(engine).length, n, "같은 접수 번호로 한 번 더 보내지 않는다");
  assert.equal(storage.map.get(LEDGER), before);
  assert.equal(storage.failGet, 0, "한 번만 읽고 멈췄다(스스로 다시 읽어 재시도하지 않는다)");
  // 읽기가 돌아오면: 중복 번호는 조용히 덮지 않고 거절, 새 접수는 정상
  const e3 = await caught(c.submit({ title: "다른 내용", prompt: "a green hill at dawn" }, { requestId: "fixed-request-0001" }));
  assert.ok(e3 instanceof EngineError && e3.kind === "invalid" && e3.beforeSend === true);
  assert.equal(storage.map.get(LEDGER), before);
  assert.equal(posts(engine).length, n);
  assert.equal((await c.submit({ title: "새 그림", prompt: "a blue bird on a branch" })).state, "accepted");
  assert.equal(c.submissions().length, 2);
  // 확인·다시 보내기·지우기도 읽지 못하면 상태를 바꾸지 않는다
  const now = storage.map.get(LEDGER);
  const calls = gets();
  storage.failGet = 1;
  assert.equal((await caught(c.confirm("fixed-request-0001"))).kind, "storage");
  storage.failGet = 1;
  const e4 = await caught(c.resend("fixed-request-0001"));
  assert.ok(e4.kind === "storage" && e4.beforeSend === true);
  storage.failGet = 1;
  assert.equal((await caught(c.forget("fixed-request-0001"))).kind, "storage");
  assert.equal(storage.map.get(LEDGER), now);
  assert.equal(gets(), calls, "엔진에 아무 요청도 가지 않았다");
});

test("손상된 접수 기록은 쓰지도 보내지도 않는다 — 「없음」(빈 칸)만 빈 기록이다", async () => {
  const broken = ["{not json", "{}", '"text"', "[1]", "[null]", '[{"title":"번호 없음"}]', '[["a"]]', JSON.stringify([ROW("dup-request-0001"), ROW("dup-request-0001")])];
  for (const raw of broken) {
    const engine = createMockEngine();
    const storage = memoryStorage();
    const c = await paired(engine, storage);
    storage.map.set(LEDGER, raw);
    const e = await caught(c.submit(OK));
    assert.ok(e instanceof EngineError && e.kind === "storage" && e.beforeSend === true, raw);
    assert.equal(storage.map.get(LEDGER), raw, "손상된 기록을 덮어쓰지 않는다: " + raw);
    assert.equal(posts(engine).length, 0, raw);
    assert.deepEqual(c.submissions().filter((s) => typeof s.requestId !== "string"), [], "화면용 읽기는 예외 없이 읽을 수 있는 줄만");
    // 묶음 접수: 보내지 않고, 「보내려 함」 표시도 남기지 않는다(요청을 시작하지 않았다)
    saveDraft(storage, A, plan("a red apple on a table\na blue bird on a branch"));
    const out = await submitRemaining(c, storage);
    assert.equal(out.sent, 0);
    assert.equal(posts(engine).length, 0);
    assert.ok(loadDraft(storage, A).every((i) => i.tried === undefined));
    assert.equal(storage.map.get(LEDGER), raw);
  }
  // 없음: 칸이 없거나 빈 배열이면 정상 신규 접수
  for (const raw of [undefined, "[]"]) {
    const engine = createMockEngine();
    const storage = memoryStorage();
    const c = await paired(engine, storage);
    if (raw !== undefined) storage.map.set(LEDGER, raw);
    assert.equal((await c.submit(OK)).state, "accepted");
    assert.equal(c.submissions().length, 1);
  }
});

test("기존 접수 기록 호환 — 예전에 적힌 줄(추가 칸이 없거나 더 있는 줄)이 있어도 읽고, 고쳐 쓸 때 그 줄을 잃지 않는다", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage();
  const c = await paired(engine, storage);
  const old = [
    { requestId: "old-request-00001", trackId: "t", link: "old-link", title: "옛 기록", task: { prompt: "a b c" }, state: "accepted", jobId: "00000000-0000-4000-8000-000000000000", at: 1 },
    // 처음 판(5-2 첫 커밋)이 적던 모양: link 칸이 없고 상태가 notReceived, 여기에 모르는 추가 칸
    { requestId: "old-request-00002", trackId: "t2", title: "처음 판", task: { prompt: "d e f", seed: 7 }, state: "notReceived", error: "받지 않음", at: 2, extra: { kept: true } },
  ];
  storage.map.set(LEDGER, JSON.stringify(old));
  const r = await c.submit(OK);
  assert.equal(r.state, "accepted");
  const after = JSON.parse(storage.map.get(LEDGER));
  assert.deepEqual(after.slice(0, 2), old, "옛 줄은 그대로");
  assert.equal(after.length, 3);
  assert.equal(after[2].jobId, r.job.id);
});

test("저장 실패 — 접수 기록을 적지 못하면 기존 기록 불변·전송 0, 되찾기는 접수됨이라고 답하지 않는다", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage();
  const c = await paired(engine, storage);
  await c.submit(OK, { requestId: "kept-request-0001" });
  const before = storage.map.get(LEDGER);
  const n = posts(engine).length;
  storage.failSet = (k) => k === LEDGER;
  const e = await caught(c.submit({ title: "t2", prompt: "a blue bird on a branch" }));
  assert.ok(e.kind === "storage" && e.beforeSend === true);
  assert.equal(storage.map.get(LEDGER), before);
  assert.equal(posts(engine).length, n);
  // 되찾기: 엔진 목록에는 있지만 적지 못함 → 예외(접수됨 응답 아님), 기록 불변
  storage.failSet = null;
  storage.map.set(LEDGER, "[]");
  storage.failSet = (k) => k === LEDGER;
  const e2 = await caught(c.recover("kept-request-0001", OK, { expectLink: c.scopeId() }));
  assert.ok(e2 instanceof EngineError && e2.kind === "storage");
  assert.equal(storage.map.get(LEDGER), "[]");
  storage.failSet = null;
  // 되찾기: 읽지 못함 → 예외, 기록 불변
  const fl = flaky();
  const e3engine = createMockEngine();
  const c3 = await paired(e3engine, fl);
  const made = await c3.submit(OK, { requestId: "kept-request-0002" });
  const snap = fl.map.get(LEDGER);
  fl.failGet = 1;
  const e3 = await caught(c3.recover("kept-request-0002", OK, { expectLink: c3.scopeId() }));
  assert.ok(e3 instanceof EngineError && e3.kind === "storage");
  assert.equal(fl.map.get(LEDGER), snap);
  assert.equal(posts(e3engine).length, 1);
  const back = await c3.recover("kept-request-0002", OK, { expectLink: c3.scopeId() });
  assert.deepEqual([back.state, back.job.id], ["accepted", made.job.id]);
});

test("반례 P3 — 되찾기 경쟁: 접수 기록에 다른 범위의 같은 접수 번호가 있으면 그 기록을 보존하고 미확정으로 답한다", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage();
  const c = await paired(engine, storage);
  const draft = saveDraft(storage, A, plan("a red apple on a table\na blue bird on a branch"));
  await submitRemaining(c, storage);
  const [id1, id2] = draft.items.map((i) => i.requestId);
  // 접수 기록 유실 뒤, 엔진 목록을 묻는 사이 다른 화면이 「다른 범위」의 같은 번호 기록을 적었다
  storage.map.set(DRAFT, JSON.stringify({ ...draft, items: draft.items.map((i) => ({ ...i, tried: Date.now() })) }));
  const foreign = { requestId: id1, trackId: "t", link: "another-scope-link", title: "다른 범위", task: { prompt: "x y z" }, state: "unknown", at: 5 };
  storage.map.set(LEDGER, "[]");
  engine.st.after = (call) => { if (call.method === "GET" && call.path === "/queue" && storage.map.get(LEDGER) === "[]") storage.map.set(LEDGER, JSON.stringify([foreign])); };
  const n = posts(engine).length;
  const { title, prompt, width, height, seed, variantId } = draft.items[0];
  const res = await c.recover(id1, { title, prompt, width, height, seed, variantId }, { expectLink: draft.link });
  assert.deepEqual(res, { state: "unknown", reason: "otherScope" }, "적지 못했으면 접수됨이라고 답하지 않는다");
  assert.deepEqual(JSON.parse(storage.map.get(LEDGER)), [foreign], "다른 범위의 기록은 그대로");
  assert.equal(posts(engine).length, n);
  engine.st.after = null;
  // 묶음 확인: 같은 번호의 기록이 있는 첫 장은 접수 기록으로 추적되는 장이라 다시 묻지 않고(다시 보내지도 않는다), 다음 장은 되찾는다
  const out = await confirmUncertain(c, storage);
  assert.deepEqual(out, { checked: 1, recovered: 1 });
  const ledger = JSON.parse(storage.map.get(LEDGER));
  assert.deepEqual(ledger[0], foreign);
  assert.deepEqual([ledger[1].requestId, ledger[1].state, ledger[1].link], [id2, "accepted", draft.link]);
  // 다른 범위 기록은 접수됨으로 바뀌지 않았고, 그 장은 이어 맡기기 대상도 아니다
  assert.equal(ledger[0].state, "unknown");
  assert.equal(draftStatus(c, storage).remaining, 0);
  assert.deepEqual(await submitRemaining(c, storage).then((r) => r.sent), 0);
  assert.equal(posts(engine).length, n, "확인은 새 작업을 만들지 않는다");
});

test("반례 P2 — 번호는 정상인데 내용이 손상된 줄: 쓰기·전송에서는 기존 기록 유지·전송 0, 화면 읽기는 그 줄을 빼고 오류 없이", async () => {
  const good = ROW("good-request-0001");
  const bad = {
    "task가 null": { task: null },
    "task가 배열": { task: ["a"] },
    "task가 글자": { task: "a b c" },
    "task 없음": { task: undefined },
    "prompt가 숫자": { task: { prompt: 5 } },
    "prompt 없음": { task: {} },
    "seed가 글자": { task: { prompt: "a b c", seed: "7" } },
    "width가 글자": { task: { prompt: "a b c", width: "1024", height: 1024 } },
    "variantId가 숫자": { task: { prompt: "a b c", variantId: 3 } },
    "보관 번호 없음": { trackId: undefined },
    "제목이 숫자": { title: 3 },
    "시각이 글자": { at: "어제" },
    "시각 없음": { at: undefined },
    "상태 없음": { state: undefined },
    "모르는 상태": { state: "done" },
    "link가 숫자": { link: 5 },
    "jobId가 객체": { jobId: {} },
    "error가 숫자": { error: 1 },
    "tag가 숫자": { tag: 1 },
    "접수 번호가 빈 글자": { requestId: "" },
  };
  for (const [name, over] of Object.entries(bad)) {
    const row = JSON.parse(JSON.stringify(ROW("bad-request-00001", over)));
    assert.equal(isSubmissionRow(row), false, name);
    const engine = createMockEngine();
    const storage = memoryStorage();
    const c = await paired(engine, storage);
    const raw = JSON.stringify([good, row]);
    storage.map.set(LEDGER, raw);
    // 쓰기·전송 경계: 새 접수, 묶음 접수 모두 거절 — 기록 불변, 전송 0
    const e = await caught(c.submit(OK));
    assert.ok(e instanceof EngineError && e.kind === "storage" && e.beforeSend === true, name);
    saveDraft(storage, A, plan("a red apple on a table"));
    assert.equal((await submitRemaining(c, storage)).sent, 0, name);
    assert.equal(storage.map.get(LEDGER), raw, name);
    assert.equal(posts(engine).length, 0, name);
    assert.equal(c.ledgerBroken(), true, name);
    // 화면 경계: 같은 기준으로 손상된 줄만 빠지고, 줄 목록을 만드는 데 오류가 없다
    const subs = c.submissions();
    assert.deepEqual(subs.map((x) => x.requestId), ["good-request-0001"], name);
    assert.doesNotThrow(() => BUILD(c, subs), name);
    assert.doesNotThrow(() => draftStatus(c, storage), name);
  }
});

test("줄 검증 기준 — 정상 줄, 선택 칸이 빠진 줄, 처음 판의 줄(link 없음·notReceived), 모르는 추가 칸은 통과한다", async () => {
  const ok = [
    ROW("ok-request-000001"),
    ROW("ok-request-000002", { link: undefined, jobId: undefined, state: "pending" }),
    ROW("ok-request-000003", { link: undefined, state: "notReceived", error: "받지 않음", jobId: undefined }),
    ROW("ok-request-000004", { state: "rejected", error: "잠시 뒤", errorKind: "busy", tag: "batch:x:1", jobId: undefined }),
    ROW("ok-request-000005", { task: { prompt: "a b c", variantId: "flux2-klein-4b-q8", width: 1280, height: 720, seed: 4004 }, future: { any: 1 } }),
    ROW("ok-request-000006", { state: "unknown", title: "" }),
  ].map((r) => JSON.parse(JSON.stringify(r)));
  for (const r of ok) assert.equal(isSubmissionRow(r), true, r.requestId);
  for (const v of [null, undefined, 1, "x", [], {}]) assert.equal(isSubmissionRow(v), false);
  // 실제로 지금 코드가 적는 줄도 이 기준을 통과한다(정상·거절·결과 모름)
  const engine = createMockEngine();
  const storage = memoryStorage();
  const c = await paired(engine, storage);
  storage.map.set(LEDGER, JSON.stringify(ok));
  assert.equal(c.ledgerBroken(), false);
  await c.submit(OK);
  engine.st.override = (call) => (isPost(call) ? new Response(JSON.stringify({ error: "잠시 뒤 다시 시도해 주세요." }), { status: 429 }) : null);
  await c.submit({ title: "t2", prompt: "a blue bird on a branch", seed: 2 });
  engine.st.override = null;
  engine.st.loseResponse = isPost;
  await c.submit({ title: "t3", prompt: "a green hill at dawn", width: 1024, height: 1024 }, { tag: "x" });
  engine.st.loseResponse = null;
  const written = JSON.parse(storage.map.get(LEDGER));
  assert.equal(written.length, 9);
  assert.deepEqual(written.slice(0, 6), ok, "옛 줄은 고쳐 쓴 뒤에도 그대로");
  assert.ok(written.every(isSubmissionRow));
  assert.equal(c.submissions().length, 9);
  assert.doesNotThrow(() => BUILD(c, c.submissions()));
});
