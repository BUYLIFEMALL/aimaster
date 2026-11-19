// 맥미니 5-3 검수(.ai/results/IMG-P1-5-3-CX-QA-01.md)의 반례를 그대로 옮긴 시험.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EngineError, createEngineClient } from "../src/lib/engine.ts";
import { findPreset } from "../src/lib/studio/presets.ts";
import { adoptDraft, buildPlan, draftStatus, dropFromDraft, legacyDraftItems, loadDraft, readDraft, remainingItems, saveDraft, submitRemaining } from "../src/lib/studio/batch.ts";
import { again, buildRows, cancelAll, cancelRow, dismissRow, restart, sendMessage } from "../src/lib/studio/jobsView.ts";
import { createSaveStore, hasCrossTabLock } from "../src/lib/studio/saveStore.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const kind = (k) => (e) => e instanceof EngineError && e.kind === k;
const isPost = (call) => call.method === "POST" && call.path === "/queue";
const posts = (engine) => engine.st.calls.filter(isPost);
const photo = findPreset("photo");
const plan = (text, over = {}) => buildPlan({ text, preset: photo, width: 1280, height: 720, ...over });
const ctxOf = (c) => ({ inScope: (id) => c.inCurrentScope(id), canResend: (id) => c.canResend(id) });
const DRAFT = `fis.draft.v1:${A}`;
async function paired(engine, storage = memoryStorage()) {
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  await c.pair(engine.st.codes[0]);
  return { c, storage };
}

test("반례 P2-1 — 새 묶음은 예전 접수와 내용·시드가 같아도 따로 맡긴다(같은 연결, 새 연결 모두)", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const same = () => plan("a red apple on a wooden table", { fixedSeed: 5 }).items;
  saveDraft(storage, A, same());
  assert.deepEqual(await submitRemaining(c, storage), { sent: 1, skipped: 0, remaining: 0 });
  // 같은 연결에서 같은 설명·크기·고정 시드로 새 묶음을 시작
  saveDraft(storage, A, same());
  assert.equal(remainingItems(c, storage).length, 1, "예전 접수 때문에 건너뛰지 않는다");
  assert.deepEqual(await submitRemaining(c, storage), { sent: 1, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).length, 2);
  assert.equal(engine.st.jobs.length, 2);
  assert.equal(new Set(posts(engine).map((x) => x.body.clientRequestId)).size, 2, "새 접수 번호");
  assert.deepEqual(posts(engine)[0].body.task, posts(engine)[1].body.task, "내용은 같다");
  // 연결을 끊고 새 범위로 연결한 뒤에도 마찬가지
  c.disconnect();
  await c.pair(engine.st.codes[0]);
  saveDraft(storage, A, same());
  assert.deepEqual(await submitRemaining(c, storage), { sent: 1, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).length, 3);
  // 묶음마다·장마다 번호가 다르다
  const a = saveDraft(storage, A, plan("a red apple on a table x2").items);
  const b = saveDraft(storage, A, plan("a red apple on a table x2").items);
  assert.notEqual(a.batchId, b.batchId);
  assert.equal(new Set([...a.items, ...b.items].map((i) => i.key)).size, 4);
  assert.equal(new Set([...a.items, ...b.items].map((i) => i.requestId)).size, 4);
});

test("접수 번호를 첫 전송 전에 묶음에 적는다 — 엔진에는 그 번호로 가고, 접수 기록에는 묶음·장 표시가 남는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan("a red apple on a table\na blue bird on a branch x2", { fixedSeed: 1 }).items);
  const planned = draft.items.map((i) => i.requestId);
  assert.equal(posts(engine).length, 0);
  // 전송 순간에 묶음을 읽어 보면 그 장의 접수 번호가 이미 적혀 있다
  const seenAtSend = [];
  const spying = createEngineClient({ memberId: A, storage, fetch: (url, init) => (init?.method === "POST" && String(url).endsWith("/queue") && seenAtSend.push([JSON.parse(init.body).clientRequestId, loadDraft(storage, A).map((i) => i.requestId)]), engine.fetch(url, init)) });
  assert.deepEqual(await submitRemaining(spying, storage), { sent: 3, skipped: 0, remaining: 0 });
  assert.deepEqual(seenAtSend.map(([id]) => id), planned, "미리 정한 번호 그대로, 순서대로");
  assert.ok(seenAtSend.every(([id, inDraft]) => inDraft.includes(id)), "보내기 전에 이미 묶음에 적혀 있었다");
  assert.deepEqual(engine.st.jobs.map((j) => j.clientRequestId), planned);
  assert.deepEqual(c.submissions().map((s) => s.requestId), planned);
  assert.deepEqual(c.submissions().map((s) => s.tag), draft.items.map((i) => `batch:${draft.batchId}:${i.key}`), "접수 기록에서 어느 묶음의 어느 장인지 알 수 있다");
  assert.ok(c.submissions().every((s) => s.link === draft.link));
  assert.ok(engine.st.calls.filter(isPost).every((x) => !("tag" in x.body)), "묶음 표시는 엔진에 보내지 않는다");
  // 같은 접수 번호로 두 번 접수하지 않는다(연결 계층이 거절)
  await assert.rejects(c.submit({ title: "t", prompt: "a red apple on a table" }, { requestId: planned[0] }), kind("invalid"));
  for (const bad of ["short", "a b c d e f g h", "", 7]) await assert.rejects(c.submit({ title: "t", prompt: "a red apple on a table" }, { requestId: bad }), kind("invalid"));
  assert.equal(posts(engine).length, 3);
});

test("반례(재검수) P2-1 — 묶음을 보관한 뒤 다른 조작이 같은 내용·시드의 접수를 만들어도, 묶음의 장은 그 접수로 여기지 않고 따로 맡긴다. 그 접수를 지워도 묶음의 장은 남는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const items = plan("a red apple on a wooden table\na blue bird on a branch", { fixedSeed: 5 }).items;
  const draft = saveDraft(storage, A, items);
  // 묶음을 보관한 **뒤에**, 다른 조작(다른 화면의 다시 만들기 등)이 첫 장과 똑같은 내용·시드로 접수를 만든다
  const { line, copy, source, ...sameInput } = items[0];
  const other = await c.submit(sameInput);
  assert.equal(other.state, "accepted");
  assert.notEqual(other.requestId, draft.items[0].requestId);
  // 묶음의 첫 장은 여전히 「맡기지 않음」이다
  assert.deepEqual(remainingItems(c, storage).map((i) => i.line), [1, 2]);
  assert.deepEqual(draftStatus(c, storage), { remaining: 2, otherScope: 0, legacy: 0, uncertain: 0 });
  // 그 다른 접수를 정리해도(기록에서 지우기) 묶음의 장은 지워지지 않는다
  dropFromDraft(storage, A, other.requestId);
  assert.deepEqual(loadDraft(storage, A).map((i) => i.requestId), draft.items.map((i) => i.requestId), "내용이 같다는 이유로 묶음의 장을 빼지 않는다");
  // 이어서 맡기면 두 장 모두 자기 접수 번호로 나간다
  assert.deepEqual(await submitRemaining(c, storage), { sent: 2, skipped: 0, remaining: 0 });
  assert.deepEqual(posts(engine).map((x) => x.body.clientRequestId), [other.requestId, ...draft.items.map((i) => i.requestId)]);
  assert.equal(engine.st.jobs.length, 3);
  // 반대로, 묶음의 장을 맡긴 뒤 내용이 같은 다른 접수를 지워도 묶음 쪽 기록은 그대로다
  assert.equal(await c.forget(other.requestId), true);
  assert.deepEqual(c.submissions().map((s) => s.requestId), draft.items.map((i) => i.requestId));
});

test("반례(재검수) P2-2 — 묶음을 맡기는 도중 연결이 새 범위로 바뀌면 남은 장을 그대로 두고 멈춘다. 한 묶음이 두 범위에 나뉘지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const draft = saveDraft(storage, A, plan("a red apple on a table\na blue bird on a branch\na green hill at dawn").items);
  assert.deepEqual(await submitRemaining(c, storage), { sent: 3, skipped: 0, remaining: 0 }, "연결이 그대로면 끝까지 맡긴다(대조)");
  assert.equal(new Set(engine.st.jobs.map((j) => j.scope)).size, 1);

  // 실제 반례: 첫 장을 맡긴 뒤 연결 교체
  const e2 = createMockEngine();
  const p2 = await paired(e2);
  const d2 = saveDraft(p2.storage, A, plan("a red apple on a table\na blue bird on a branch\na green hill at dawn").items);
  const other = createEngineClient({ memberId: A, storage: p2.storage, fetch: e2.fetch });
  let open;
  const gate = new Promise((res) => (open = res));
  let held = 0;
  e2.st.hold = (call) => (isPost(call) && held++ === 0 ? gate : null);
  const pending = submitRemaining(p2.c, p2.storage);
  await new Promise((res) => setTimeout(res, 5));
  other.disconnect();
  e2.st.hold = null;
  await other.pair(e2.st.codes[0]); // 새 범위
  open();
  const out = await pending;
  assert.equal(out.sent, 1);
  assert.ok(out.stopped, "멈춘 이유가 있다");
  assert.equal(posts(e2).length, 1, "둘째 장을 새 범위로 보내지 않았다");
  assert.equal(new Set(e2.st.jobs.map((j) => j.scope)).size, 1, "한 묶음의 작업 범위는 하나");
  assert.deepEqual(loadDraft(p2.storage, A).map((i) => i.requestId), d2.items.map((i) => i.requestId), "남은 장을 그대로 두었다");
  // 새 범위의 화면에서 「이어서 맡기기」를 눌러도 보내지 않는다
  const fresh = createEngineClient({ memberId: A, storage: p2.storage, fetch: e2.fetch });
  assert.notEqual(fresh.scopeId(), d2.link);
  const again2 = await submitRemaining(fresh, p2.storage);
  assert.equal(again2.stopped.kind, "scope");
  assert.equal(again2.sent, 0);
  assert.equal(posts(e2).length, 1);
  assert.deepEqual(draftStatus(fresh, p2.storage), { remaining: 0, otherScope: 2, legacy: 0, uncertain: 0 }, "보내지 않은 두 장만 남은 장이다");
  // 첫 장은 옛 연결에서 접수됐다(접수 기록 있음) — 다시 보내지 않고, 새 연결에서는 더 볼 수 없는 줄로 보인다
  const firstSub = fresh.submissions().find((s) => s.requestId === d2.items[0].requestId);
  assert.equal(firstSub.state, "accepted");
  assert.equal(firstSub.link, d2.link);
  assert.equal(fresh.inCurrentScope(firstSub.requestId), false);
  const row = buildRows(fresh.submissions(), await fresh.listJobs(), ctxOf(fresh))[0];
  assert.equal(row.phase, "gone");
  assert.deepEqual(row.actions, ["discard"]);
  assert.equal(remainingItems(fresh, p2.storage).length, 2);
});

test("연결이 바뀐 묶음의 남은 장: 사용자가 확인했을 때만 새 묶음(새 접수 번호, 지금 범위)으로 옮긴다 — 접수 기록이 있는 장은 옮기지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const d1 = saveDraft(storage, A, plan("a red apple on a table\na blue bird on a branch\na green hill at dawn").items);
  let n = 0;
  await submitRemaining(c, storage, { shouldStop: () => n++ >= 1 }); // 첫 장만 맡김(접수 기록 있음)
  c.disconnect();
  await c.pair(engine.st.codes[0]);
  assert.deepEqual(draftStatus(c, storage), { remaining: 0, otherScope: 2, legacy: 0, uncertain: 0 });
  assert.equal((await submitRemaining(c, storage)).stopped.kind, "scope");
  assert.throws(() => adoptDraft(c, storage, false), kind("invalid"));
  assert.equal(readDraft(storage, A).batchId, d1.batchId, "확인 없이는 묶음이 그대로");
  const d2 = adoptDraft(c, storage, true);
  assert.notEqual(d2.batchId, d1.batchId);
  assert.equal(d2.link, c.scopeId());
  assert.deepEqual(d2.items.map((i) => i.source), ["a blue bird on a branch", "a green hill at dawn"], "이미 접수 기록이 있는 첫 장은 옮기지 않는다");
  assert.ok(d2.items.every((i) => !d1.items.some((o) => o.requestId === i.requestId)), "새 접수 번호");
  assert.deepEqual(await submitRemaining(c, storage), { sent: 2, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).length, 3);
  assert.equal(new Set(posts(engine).map((x) => x.body.clientRequestId)).size, 3);
  // 같은 범위의 묶음은 옮길 것이 없다
  saveDraft(storage, A, plan("a small boat on a river").items);
  assert.equal(adoptDraft(c, storage, true), null);
});

test("접수 번호가 없는 예전 형식 묶음(v1·v2): 맡겼는지 근거가 없어 자동으로 이어 맡기지 않고 확인 대기로 남긴다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const items = plan("a red apple on a table\na blue bird on a branch", { fixedSeed: 3 }).items;
  // 예전 묶음의 첫 장과 내용이 같은 접수가 이미 있다(예전 규칙이라면 「맡긴 것」으로 짝지었을 상황)
  const { line, copy, source, ...first } = items[0];
  await c.submit(first);
  const olds = [
    { v: 1, items },
    { v: 2, batchId: "b", startedAt: 1, before: [], items: items.map((it, k) => ({ ...it, key: `k${k}` })) },
    { v: 2, batchId: "b", startedAt: 1, before: null, items: items.map((it, k) => ({ ...it, key: `k${k}`, ...(k === 0 ? { requestId: "old-request-0001" } : {}) })) },
  ];
  for (const old of olds) {
    storage.map.set(DRAFT, JSON.stringify(old));
    assert.equal(readDraft(storage, A), null, "지금 형식의 묶음이 아니다");
    assert.equal(legacyDraftItems(storage, A).length, 2);
    assert.deepEqual(draftStatus(c, storage), { remaining: 0, otherScope: 0, legacy: 2, uncertain: 0 });
    assert.deepEqual(remainingItems(c, storage), []);
    // 자동으로 이어 맡기지 않는다 — 내용이 같은 접수가 있든 없든
    assert.deepEqual(await submitRemaining(c, storage), { sent: 0, skipped: 0, remaining: 0 });
    assert.equal(posts(engine).length, 1, `v${old.v}: 보내지 않았다`);
    assert.ok(storage.map.has(DRAFT), "확인 대기로 보존한다(지우지 않는다)");
    // 다른 접수를 정리해도 예전 묶음의 장은 지워지지 않는다
    dropFromDraft(storage, A, c.submissions()[0].requestId);
    assert.equal(legacyDraftItems(storage, A).length, 2);
  }
  // 사용자가 중복 가능성을 확인한 경우에만 새 묶음으로 옮겨 맡긴다(전부 — 어느 장이 맡겨졌는지 모른다)
  assert.throws(() => adoptDraft(c, storage, false), kind("invalid"));
  const d = adoptDraft(c, storage, true);
  assert.equal(d.items.length, 2);
  assert.ok(d.items.every((i) => /^[A-Za-z0-9-]{8,64}$/.test(i.requestId) && i.requestId !== "old-request-0001"));
  assert.deepEqual(await submitRemaining(c, storage), { sent: 2, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).length, 3);
  // 손상된 예전 묶음은 장으로 세지 않는다
  for (const bad of [{ v: 1, items: [{ title: "t", prompt: "한글 설명입니다 요", seed: 1 }] }, { v: 2, items: "x" }, { v: 1, items: Array.from({ length: 25 }, () => items[0]) }]) {
    storage.map.set(DRAFT, JSON.stringify(bad));
    assert.equal(legacyDraftItems(storage, A).length, 0);
  }
});

test("다른 화면이 맡길 목록을 바꾸면 이어 맡기기를 멈춘다(새 묶음의 장을 옛 묶음 번호로 보내지 않는다)", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  saveDraft(storage, A, plan("a red apple on a table\na blue bird on a branch\na green hill at dawn").items);
  let n = 0;
  const out = await submitRemaining(c, storage, {
    onProgress: () => {
      if (++n === 1) saveDraft(storage, A, plan("a small boat on a river").items); // 다른 탭이 새 묶음을 시작
    },
  });
  assert.equal(out.stopped.kind, "changed");
  assert.equal(out.sent, 1);
  assert.equal(posts(engine).length, 1);
  assert.equal(loadDraft(storage, A).length, 1, "새 묶음은 그대로 남아 있다");
  assert.equal(loadDraft(storage, A)[0].source, "a small boat on a river");
});

test("반례(재검수) P3 — 작업 번호가 없는 접수됨은 목록에 접수 번호가 같은 줄이 있어도 채택하지 않는다. 「엔진에 확인」으로 되찾은 뒤에만 저장·조작이 열린다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const r = await c.submit({ title: "t", prompt: "a red apple on a table", seed: 1 });
  engine.finish(r.job.id);
  // 접수 기록에서 작업 번호만 빠진 상태(예전 기록·손상)
  const key = `fis.submissions.v1:${A}`;
  storage.map.set(key, JSON.stringify(JSON.parse(storage.map.get(key)).map(({ jobId, ...rest }) => rest)));
  assert.equal(c.submissions()[0].state, "accepted");
  assert.equal(c.submissions()[0].jobId, undefined);
  const jobs = await c.listJobs();
  assert.equal(jobs[0].clientRequestId, r.requestId, "목록에는 접수 번호가 같은 완료 작업이 있다");
  let row = buildRows(c.submissions(), jobs, ctxOf(c))[0];
  assert.equal(row.phase, "unknown");
  assert.equal(row.jobId, undefined, "목록의 작업 번호를 채택하지 않았다");
  assert.deepEqual(row.actions, ["confirm", "discard"], "저장·다시 만들기·지우기 버튼이 없다");
  assert.deepEqual(buildRows(c.submissions(), null, ctxOf(c))[0].actions, ["confirm", "discard"], "목록을 못 읽어도 같다");
  // 실행 함수도 거절한다(버튼을 우회해도)
  const before = engine.st.calls.length;
  for (const act of [() => again(c, r.requestId), () => restart(c, r.requestId), () => cancelRow(c, r.requestId), () => dismissRow(c, r.requestId)]) await assert.rejects(act(), kind("invalid"));
  assert.equal(engine.st.calls.length, before);
  // 명시적 확인 → 같은 범위에서 작업 번호를 되찾음 → 그제야 열린다
  const ok = await c.confirm(r.requestId);
  assert.equal(ok.state, "accepted");
  assert.equal(c.submissions()[0].jobId, r.job.id);
  row = buildRows(c.submissions(), await c.listJobs(), ctxOf(c))[0];
  assert.equal(row.phase, "done");
  assert.deepEqual(row.actions, ["save", "again", "dismiss"]);
  // 범위가 바뀐 뒤라면 확인으로도 되찾지 못한다
  storage.map.set(key, JSON.stringify(JSON.parse(storage.map.get(key)).map(({ jobId, ...rest }) => rest)));
  c.disconnect();
  await c.pair(engine.st.codes[0]);
  assert.deepEqual(buildRows(c.submissions(), await c.listJobs(), ctxOf(c))[0].actions, ["discard"]);
});

test("탭 사이 잠금이 없는 브라우저의 제약을 알린다(화면과 문서)", async () => {
  assert.equal(typeof hasCrossTabLock(), "boolean");
  const src = await readFile(new URL("../src/lib/studio/lock.ts", import.meta.url), "utf8");
  assert.ok(src.includes("export const hasCrossTabLock = (): boolean => !!webLocks();"));
  const jobs = await readFile(new URL("../src/components/studio/JobsScreen.tsx", import.meta.url), "utf8");
  assert.ok(jobs.includes("useEffect(() => setCrossTab(hasCrossTabLock()), []);"));
  assert.ok(jobs.includes("{!crossTab && ("));
  assert.match(jobs, /여러 탭이 동시에 저장하는 것을 막지 못합니다.*두 번 저장될 수 있으니, 저장은 한 탭에서만/);
  // 잠금이 없는 환경을 흉내 내면(화면마다 따로 잠금) 두 화면의 동시 저장은 실제로 두 번 쓴다 — 그래서 알림이 필요하다
  const storage = memoryStorage();
  const solo = () => createSaveStore(storage, A, { lock: (_n, fn) => fn() });
  let open;
  const gate = new Promise((res) => (open = res));
  let writes = 0;
  const write = async () => {
    writes++;
    await gate;
  };
  const row = { requestId: "req-00000001", title: "그림" };
  const both = Promise.all([solo().saveOnce(row, async () => new Blob(["x"]), write), solo().saveOnce(row, async () => new Blob(["x"]), write)]);
  await new Promise((res) => setTimeout(res, 10));
  open();
  await both;
  assert.equal(writes, 2, "탭 사이 잠금이 없으면 막지 못한다(알려진 제약)");
  const doc = await readFile(new URL("../docs/PLAN_20261119_P1_WEB.md", import.meta.url), "utf8");
  assert.match(doc, /Web Locks.{0,80}없는 브라우저/);
});

test("반례 P2-2a — 접수 번호가 같아도 작업 번호가 접수 기록과 다른 목록 줄은 상태·버튼으로 쓰지 않는다", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  const r = await c.submit({ title: "t", prompt: "a red apple on a table", seed: 1 });
  const subs = c.submissions();
  const real = (await c.listJobs())[0];
  const fake = { ...real, id: "99999999-9999-4999-8999-999999999999", status: "failed" };
  const rows = buildRows(subs, [fake], ctxOf(c));
  assert.equal(rows[0].phase, "waiting");
  assert.deepEqual(rows[0].actions, [], "다시 시작·지우기 버튼을 주지 않는다");
  assert.equal(rows[0].jobId, r.job.id, "접수 기록의 작업 번호를 유지");
  assert.match(rows[0].error, /작업 번호가 다릅니다/);
  // 번호가 맞으면 평소대로
  assert.deepEqual(buildRows(subs, [{ ...real, status: "failed" }], ctxOf(c))[0].actions, ["restart", "dismiss"]);
});

test("반례 P2-2b — 실행 직전 범위 재확인: 연결이 새 범위로 바뀐 뒤에는 예전 줄의 다시 시작·다시 만들기·취소·지우기가 아무것도 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  const failed = await c.submit({ title: "실패", prompt: "a red apple on a table", seed: 1 });
  const done = await c.submit({ title: "완료", prompt: "a blue bird on a branch", seed: 2 });
  const queued = await c.submit({ title: "대기", prompt: "a green hill at dawn", seed: 3 });
  engine.finish(failed.job.id, "failed");
  engine.finish(done.job.id);
  const oldRows = buildRows(c.submissions(), await c.listJobs(), ctxOf(c)); // 화면에 보이던 예전 줄
  assert.deepEqual(oldRows.find((x) => x.requestId === failed.requestId).actions, ["restart", "dismiss"]);
  // 새 범위로 연결
  c.disconnect();
  await c.pair(engine.st.codes[0]);
  const before = engine.st.calls.length;
  for (const act of [() => restart(c, failed.requestId), () => again(c, done.requestId), () => cancelRow(c, queued.requestId), () => dismissRow(c, failed.requestId)]) {
    await assert.rejects(act(), (e) => kind("invalid")(e) && /목록을 새로 읽은 뒤/.test(e.message));
  }
  assert.equal(engine.st.calls.length, before, "엔진에 아무것도 보내지 않았다(목록 조회도 하지 않음)");
  assert.equal(posts(engine).length, 3);
  // 모두 멈추기도 지금 범위의 목록만 본다 — 예전 범위의 대기 작업은 건드리지 않는다
  assert.deepEqual(await cancelAll(c), { cancelled: 0, failed: 0 });
  assert.equal(engine.st.jobs.find((j) => j.id === queued.job.id).status, "queued");
  // 예전 줄은 새 범위에서 「더 볼 수 없음」으로 보이고 버튼은 기록 지우기뿐
  const rows = buildRows(c.submissions(), await c.listJobs(), ctxOf(c));
  assert.ok(rows.every((x) => x.phase === "gone" && x.actions.join() === "discard"));
});

test("반례 P2-2b — 목록을 읽는 사이 다른 화면이 연결을 바꾸면 다시 시작하지 않는다. 작업 번호·상태가 달라져도 마찬가지", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const failed = await c.submit({ title: "실패", prompt: "a red apple on a table", seed: 1 });
  engine.finish(failed.job.id, "failed");
  // 가) 목록 응답을 기다리는 사이 다른 탭이 새 범위로 연결
  let open;
  const gate = new Promise((res) => (open = res));
  let held = 0;
  engine.st.hold = (call) => (call.method === "GET" && call.path === "/queue" && held++ === 0 ? gate : null);
  const pending = restart(c, failed.requestId);
  const tab2 = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  tab2.disconnect();
  await tab2.pair(engine.st.codes[0]);
  open();
  engine.st.hold = null;
  await assert.rejects(pending, kind("invalid"));
  assert.equal(posts(engine).length, 1, "새 범위로 보내지 않았다");
  // 나) 같은 범위에서: 그사이 상태가 바뀌었으면(이미 다시 그리는 중 등) 하지 않는다
  const e2 = createMockEngine();
  const { c: c2, storage: s2 } = await paired(e2);
  const f2 = await c2.submit({ title: "실패", prompt: "a red apple on a table", seed: 1 });
  await assert.rejects(restart(c2, f2.requestId), kind("invalid"), "아직 대기 중인 작업은 다시 시작할 수 없다");
  e2.finish(f2.job.id, "failed");
  // 접수 기록의 작업 번호와 목록의 작업 번호가 다르면 하지 않는다
  const key = `fis.submissions.v1:${A}`;
  const ledger = JSON.parse(s2.map.get(key));
  s2.map.set(key, JSON.stringify(ledger.map((x) => ({ ...x, jobId: "99999999-9999-4999-8999-999999999999" }))));
  await assert.rejects(restart(c2, f2.requestId), kind("invalid"));
  await assert.rejects(dismissRow(c2, f2.requestId), kind("invalid"));
  s2.map.set(key, JSON.stringify(ledger));
  assert.equal(posts(e2).length, 1);
  // 모두 맞으면 한다 — 새 접수 번호, 같은 내용
  const ok = await restart(c2, f2.requestId);
  assert.equal(ok.state, "accepted");
  assert.notEqual(ok.requestId, f2.requestId);
  assert.deepEqual(posts(e2)[1].body.task, posts(e2)[0].body.task);
  // 한 줄 취소·지우기도 지금 목록에서 확인된 작업 번호로만
  await cancelRow(c2, ok.requestId);
  assert.equal(e2.st.jobs.find((j) => j.id === ok.job.id).status, "cancelled");
  await assert.rejects(cancelRow(c2, ok.requestId), kind("invalid"), "이미 취소된 작업");
  await dismissRow(c2, ok.requestId);
  assert.equal(e2.st.jobs.some((j) => j.id === ok.job.id), false);
});

test("반례 P2-3 — 다시 보낸 결과가 「받았는지 모름」이면 접수되지 않았다고 말하지 않는다", async () => {
  assert.equal(sendMessage({ state: "accepted" }), "다시 보내 접수됐습니다.");
  assert.match(sendMessage({ state: "unknown" }), /받았는지 확인하지 못했습니다.*이미 받았을 수 있으니.*엔진에 확인/);
  assert.ok(!/접수되지 않았습니다/.test(sendMessage({ state: "unknown" })));
  assert.equal(sendMessage({ state: "rejected", error: { message: "잠시 뒤 다시 시도해 주세요." } }), "접수되지 않았습니다 — 잠시 뒤 다시 시도해 주세요.");
  assert.equal(sendMessage({ state: "rejected" }), "접수되지 않았습니다");
  assert.equal(sendMessage({ state: "accepted" }, "새로 맡겨"), "새로 맡겨 접수됐습니다.");
  // 실제 흐름: 넣기 전 거절 → 다시 보내기의 응답 유실(엔진은 받음)
  const engine = createMockEngine();
  const { c } = await paired(engine);
  engine.st.override = (call) => (isPost(call) ? new Response(JSON.stringify({ error: "잠시 뒤 다시 시도해 주세요." }), { status: 429 }) : null);
  const r = await c.submit({ title: "t", prompt: "a red apple on a table", seed: 1 });
  engine.st.override = null;
  engine.st.loseResponse = isPost;
  const res = await c.resend(r.requestId);
  engine.st.loseResponse = null;
  assert.equal(res.state, "unknown");
  assert.equal(engine.st.jobs.length, 1, "엔진은 받았다");
  assert.match(sendMessage(res), /엔진에 확인/);
  const row = buildRows(c.submissions(), await c.listJobs(), ctxOf(c))[0];
  assert.equal(row.phase, "unknown");
  assert.deepEqual(row.actions, ["confirm", "replace", "discard"]);
  // 화면은 이 문장 함수를 쓴다(직접 문구를 만들지 않는다)
  const screen = await readFile(new URL("../src/components/studio/JobsScreen.tsx", import.meta.url), "utf8");
  assert.ok(screen.includes("return sendMessage(await engine.resend(id));"));
  assert.ok(!screen.includes("아직 접수되지 않았습니다"));
});

test("반례 P3 — 화면(저장 기록 객체)이 둘이어도 같은 그림은 한 번만 쓴다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const r = await c.submit({ title: "그림", prompt: "a red apple on a table", seed: 1, width: 1280, height: 720 });
  engine.finish(r.job.id);
  const row = { requestId: r.requestId, title: "그림", width: 1280, height: 720 };
  const one = createSaveStore(storage, A);
  const two = createSaveStore(storage, A); // 다른 화면
  // 쓰기를 붙잡아 두 화면이 동시에 저장에 들어오게 한다
  let open;
  const gate = new Promise((res) => (open = res));
  const written = [];
  const slowWrite = async (name) => {
    written.push(name);
    await gate;
  };
  const p1 = one.saveOnce(row, () => c.fetchArt(r.job.id), slowWrite);
  const p2 = two.saveOnce(row, () => c.fetchArt(r.job.id), slowWrite);
  await new Promise((res) => setTimeout(res, 20));
  assert.equal(written.length, 1, "둘째 화면은 첫째가 끝날 때까지 쓰기에 들어가지 않는다");
  assert.equal(one.isSaving(row.requestId), true);
  open();
  const [a, b] = await Promise.all([p1, p2]);
  assert.deepEqual([a.saved, b.saved], [true, false]);
  assert.equal(a.info.name, b.info.name);
  assert.equal(written.length, 1, "쓰기는 한 번");
  assert.equal(engine.st.calls.filter((x) => x.path.startsWith("/image-art/")).length, 1, "그림도 한 번만 받았다");
  assert.equal(one.isSaving(row.requestId), false);
  // 앞 사람이 실패하면 뒷사람이 이어서 저장한다(잠금이 풀린다)
  const row2 = { ...row, requestId: "other-request-0002" };
  const fail = one.saveOnce(row2, async () => new Blob(["x"]), async () => Promise.reject(new Error("권한 없음")));
  const next = two.saveOnce(row2, async () => new Blob(["x"]), async (name) => void written.push(name));
  await assert.rejects(fail, /권한 없음/);
  assert.equal((await next).saved, true);
  assert.equal(written.length, 2);
  // 잠금을 넣어 줄 수 있다(브라우저에서는 탭 사이에 듣는 Web Locks) — 넣은 잠금 이름은 회원·접수 번호별
  const names = [];
  const custom = createSaveStore(memoryStorage(), A, { lock: async (name, fn) => (names.push(name), fn()) });
  await custom.saveOnce(row, async () => new Blob(["x"]), async () => {});
  assert.deepEqual(names, [`fis.save:${A}:${r.requestId}`]);
  const src = await readFile(new URL("../src/lib/studio/lock.ts", import.meta.url), "utf8");
  assert.match(src, /navigator\?\.locks/);
  assert.ok(src.includes("if (locks) return (name, fn) => locks.request(name, fn);"));
  assert.ok((await readFile(new URL("../src/lib/studio/saveStore.ts", import.meta.url), "utf8")).includes('import { defaultLock, type Lock } from "./lock.ts";'), "저장도 같은 잠금 모듈을 쓴다");
});

test("반례 P3(접근성) — 준비 전에는 링크가 아니라 꺼진 버튼, 확인 창은 포커스를 옮기고 돌려준다", async () => {
  const start = await readFile(new URL("../src/components/studio/StartScreen.tsx", import.meta.url), "utf8");
  assert.ok(!/aria-disabled/.test(start), "꺼진 것처럼 보이는 링크를 두지 않는다");
  assert.ok(!/pointer-events-none/.test(start));
  const tail = start.slice(start.indexOf("{ready ? ("));
  assert.match(tail, /\{ready \? \(\s*<Link href="\/create"/);
  assert.match(tail, /<button type="button" disabled aria-describedby="not-ready"/);
  assert.equal(start.split('href="/create"').length - 1, 1, "만들기로 가는 링크는 준비됐을 때의 하나뿐");
  assert.match(tail, /id="not-ready"/);

  const jobs = await readFile(new URL("../src/components/studio/JobsScreen.tsx", import.meta.url), "utf8");
  assert.match(jobs, /opener\.current = document\.activeElement instanceof HTMLElement \? document\.activeElement : null;/, "창을 연 버튼을 기억");
  assert.match(jobs, /cancelButton\.current\?\.focus\(\);/, "열리면 「그만두기」로 포커스");
  // Esc 닫기와 「닫히면 연 버튼으로」는 공용 훅(useDismiss)이 맡는다 — 겹쳐 열려도 맨 위 하나만 닫힌다(tests/dismiss.test.mjs).
  assert.ok(jobs.includes("const opener = useDismiss<HTMLElement>(!!confirmReplace, () => setConfirmReplace(null));"), "Esc로 닫고 닫히면 연 버튼으로 포커스 복귀");
  const dismissHook = await readFile(new URL("../src/components/studio/useDismiss.ts", import.meta.url), "utf8");
  assert.match(dismissHook, /opener\.current\?\.focus\(\);/);
  assert.match(dismissHook, /window\.removeEventListener\("keydown", onKey\);/, "닫히면 Esc 듣기를 뗀다(훅)");
  assert.match(jobs, /role="alertdialog" aria-modal="false" aria-labelledby="replace-title" aria-describedby="replace-desc"/);
  assert.match(jobs, /<button type="button" ref=\{cancelButton\}/);
  assert.match(jobs, /\}, \[confirmReplace\]\);/);
});
