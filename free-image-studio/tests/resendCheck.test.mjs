// 맥미니 8922c3cc 재검수 P3: 형식은 맞지만 범위가 틀린 보관 값 — 다시 보내기 직전에 첫 접수와 같은 값 검사.
import test from "node:test";
import assert from "node:assert/strict";
import { EngineError, SEED_MAX, checkStoredEntry, createEngineClient, isSubmissionRow } from "../src/lib/engine.ts";
import { findPreset } from "../src/lib/studio/presets.ts";
import { buildPlan, loadDraft, readDraft, saveDraft, submitRemaining } from "../src/lib/studio/batch.ts";
import { buildRows } from "../src/lib/studio/jobsView.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const LEDGER = `fis.submissions.v1:${A}`;
const isPost = (call) => call.method === "POST" && call.path === "/queue";
const posts = (engine) => engine.st.calls.filter(isPost);
const caught = (p) => p.then(() => null, (e) => e);
const TRACK = "11111111-2222-4333-8444-555555555555";
async function paired(engine, storage = memoryStorage()) {
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  await c.pair(engine.st.codes[0]);
  return { c, storage };
}
/** 넣기 전 거절(다시 해 볼 만한 사유)로 남은 줄 */
const rejected = (c, over = {}) => ({ requestId: "retry-request-0001", trackId: TRACK, link: c.scopeId(), title: "다시 보낼 줄", task: { prompt: "a red apple on a table" }, state: "rejected", error: "잠시 뒤 다시 시도해 주세요.", errorKind: "busy", at: 10, ...over });

test("반례 P3 — 보관된 값이 범위를 벗어나면 다시 보내기 직전에 막는다: 전송 0, 기록 불변, 줄은 계속 보인다", async () => {
  const bad = {
    "음수 시드": { task: { prompt: "a red apple on a table", seed: -1 } },
    "소수 시드": { task: { prompt: "a red apple on a table", seed: 1.5 } },
    "상한을 넘는 시드": { task: { prompt: "a red apple on a table", seed: SEED_MAX + 1 } },
    "없는 크기": { task: { prompt: "a red apple on a table", width: 999, height: 999 } },
    "한쪽만 있는 크기": { task: { prompt: "a red apple on a table", width: 1024 } },
    "한글 설명": { task: { prompt: "빨간 사과 하나 식탁 위" } },
    "두 단어 설명": { task: { prompt: "red apple" } },
    "빈 설명": { task: { prompt: "   " } },
    "모델 구성 이름의 금지 문자": { task: { prompt: "a red apple on a table", variantId: "Bad Name!" } },
    "빈 제목": { title: "  " },
    "보관 번호 형식": { trackId: "t" },
    "접수 번호 형식": { requestId: "abc" },
  };
  for (const [name, over] of Object.entries(bad)) {
    const engine = createMockEngine();
    const { c, storage } = await paired(engine);
    const row = rejected(c, over);
    assert.equal(isSubmissionRow(JSON.parse(JSON.stringify(row))), true, name + ": 구조 검사는 통과하는 줄");
    assert.notEqual(checkStoredEntry(row), null, name);
    const raw = JSON.stringify([row]);
    storage.map.set(LEDGER, raw);
    assert.equal(c.canResend(row.requestId), false, name);
    const e = await caught(c.resend(row.requestId));
    assert.ok(e instanceof EngineError && e.kind === "invalid" && e.beforeSend === true, name);
    assert.equal(posts(engine).length, 0, name + ": 엔진에 보내지 않는다");
    assert.equal(storage.map.get(LEDGER), raw, name + ": 상태도 바꾸지 않는다");
    // 기록은 계속 보이고, 화면 줄에는 다시 보내기 버튼이 없다
    const subs = c.submissions();
    assert.equal(subs.length, 1, name);
    const rows = buildRows(subs, [], { inScope: (id) => c.inCurrentScope(id), canResend: (id) => c.canResend(id) });
    assert.equal(rows.length, 1, name);
    assert.ok(!rows[0].actions.includes("resend"), name);
    // 손상이 아니므로 새 접수는 정상으로 된다
    assert.equal(c.ledgerBroken(), false, name);
    assert.equal((await c.submit({ title: "새 그림", prompt: "a blue bird on a branch" })).state, "accepted", name);
  }
});

test("경계·정상 다시 보내기 — 시드 0과 상한, 크기 세 가지, 선택 값 없음은 그대로 보내고 접수 번호·범위·내용을 지킨다", async () => {
  const ok = [
    { task: { prompt: "a red apple on a table" } },
    { task: { prompt: "a red apple on a table", seed: 0 } },
    { task: { prompt: "a red apple on a table", seed: SEED_MAX } },
    { task: { prompt: "a red apple on a table", width: 1024, height: 1024 } },
    { task: { prompt: "a red apple on a table", width: 1280, height: 720, seed: 4004 } },
    { task: { prompt: "a red apple on a table", width: 720, height: 1280, variantId: "flux2-klein-4b-q8" } },
  ];
  for (const over of ok) {
    const engine = createMockEngine();
    const { c, storage } = await paired(engine);
    const row = rejected(c, over);
    assert.equal(checkStoredEntry(row), null);
    storage.map.set(LEDGER, JSON.stringify([row]));
    assert.equal(c.canResend(row.requestId), true);
    const res = await c.resend(row.requestId);
    assert.equal(res.state, "accepted");
    const sent = posts(engine);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].body.clientRequestId, row.requestId, "같은 접수 번호");
    assert.equal(sent[0].body.track.id, row.trackId);
    assert.deepEqual(sent[0].body.task, row.task, "같은 내용");
    const after = c.submissions()[0];
    assert.deepEqual([after.requestId, after.link, after.trackId, after.state, after.jobId], [row.requestId, row.link, row.trackId, "accepted", res.job.id], "접수 번호·범위는 그대로");
  }
});

test("묶음에서 거절된 장을 다시 보낼 때 — 접수 번호·연결 범위·「보내려 함」 표시를 지킨다. 값이 어긋난 장은 표시와 기록을 그대로 둔 채 막는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, buildPlan({ text: "a red apple on a table\na blue bird on a branch", preset: findPreset("photo"), width: 1280, height: 720 }).items);
  const [id, id2] = draft.items.map((x) => x.requestId);
  // 첫 장만 보내고(엔진이 넣기 전에 거절) 멈춘다 — 묶음에는 표시가 붙은 첫 장과 아직 안 보낸 둘째 장이 남는다
  engine.st.override = (call) => (isPost(call) ? new Response(JSON.stringify({ error: "잠시 뒤 다시 시도해 주세요." }), { status: 429 }) : null);
  let n = 0;
  await submitRemaining(c, storage, { shouldStop: () => n++ >= 1 });
  engine.st.override = null;
  const marks = () => readDraft(storage, A).items.map((x) => [x.requestId, x.tried === undefined ? null : x.tried]);
  const before = marks();
  assert.ok(before[0][1] > 0, "요청이 나간 뒤의 거절이라 표시가 남아 있다");
  assert.deepEqual(before[1], [id2, null]);
  assert.equal(c.submissions()[0].state, "rejected");
  // 보관 값이 어긋나게 바뀐 경우: 막고, 표시·기록·묶음 그대로
  const good = storage.map.get(LEDGER);
  const tampered = JSON.stringify(JSON.parse(good).map((r) => ({ ...r, task: { ...r.task, seed: -1 } })));
  storage.map.set(LEDGER, tampered);
  const e = await caught(c.resend(id));
  assert.ok(e instanceof EngineError && e.kind === "invalid" && e.beforeSend === true);
  assert.equal(posts(engine).length, 1, "처음의 거절된 전송 한 번뿐");
  assert.equal(storage.map.get(LEDGER), tampered);
  assert.deepEqual(marks(), before);
  assert.equal(readDraft(storage, A).link, draft.link);
  // 값이 멀쩡하면: 같은 번호로 다시 보내 접수, 범위·표시·둘째 장 그대로
  storage.map.set(LEDGER, good);
  const res = await c.resend(id);
  assert.equal(res.state, "accepted");
  const sent = posts(engine);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent.map((p) => p.body.clientRequestId), [id, id]);
  assert.deepEqual(sent[1].body.task, sent[0].body.task);
  const row = c.submissions()[0];
  assert.deepEqual([row.requestId, row.link, row.state], [id, draft.link, "accepted"]);
  assert.deepEqual(marks(), before, "다시 보내기는 묶음의 표시와 접수 번호를 건드리지 않는다");
  assert.equal(readDraft(storage, A).link, draft.link);
  assert.equal(engine.st.jobs.length, 1);
  // 이어 맡기면 둘째 장만 간다
  assert.deepEqual(await submitRemaining(c, storage).then((r) => [r.sent, r.skipped]), [1, 1]);
  assert.deepEqual(posts(engine).map((p) => p.body.clientRequestId), [id, id, id2]);
});
