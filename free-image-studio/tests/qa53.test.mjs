// 맥미니 5-3 검수(.ai/results/IMG-P1-5-3-CX-QA-01.md)의 반례를 그대로 옮긴 시험.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EngineError, createEngineClient } from "../src/lib/engine.ts";
import { findPreset } from "../src/lib/studio/presets.ts";
import { buildPlan, loadDraft, readDraft, remainingItems, resolveDraft, saveDraft, submitRemaining } from "../src/lib/studio/batch.ts";
import { again, buildRows, cancelAll, cancelRow, dismissRow, restart, sendMessage } from "../src/lib/studio/jobsView.ts";
import { createSaveStore } from "../src/lib/studio/saveStore.ts";
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
  // 같은 연결에서 같은 설명·크기·시드로 새 묶음을 시작
  const d2 = saveDraft(storage, A, same());
  assert.equal(remainingItems(c, storage).length, 1, "예전 접수 때문에 건너뛰지 않는다");
  assert.deepEqual(await submitRemaining(c, storage), { sent: 1, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).length, 2);
  assert.equal(engine.st.jobs.length, 2);
  assert.equal(new Set(posts(engine).map((x) => x.body.clientRequestId)).size, 2, "새 접수 번호");
  assert.deepEqual(posts(engine)[0].body.task, posts(engine)[1].body.task, "내용은 같다");
  assert.deepEqual(d2.before, [c.submissions()[0].requestId], "새 묶음은 시작할 때 이미 있던 접수 번호를 적어 둔다");
  // 연결을 끊고 새 범위로 연결한 뒤에도 마찬가지
  c.disconnect();
  await c.pair(engine.st.codes[0]);
  saveDraft(storage, A, same());
  assert.deepEqual(await submitRemaining(c, storage), { sent: 1, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).length, 3);
  assert.equal(engine.st.jobs.length, 3);
  // 묶음마다 번호가 다르고, 항목마다 번호가 다르다
  const a = saveDraft(storage, A, plan("a red apple on a table x2").items);
  const b = saveDraft(storage, A, plan("a red apple on a table x2").items);
  assert.notEqual(a.batchId, b.batchId);
  assert.equal(new Set([...a.items, ...b.items].map((i) => i.key)).size, 4);
});

test("묶음에 실제 접수 번호를 적는다 — 이어서 맡기기는 그 묶음의 항목만 본다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  saveDraft(storage, A, plan("a red apple on a table\na blue bird on a branch\na green hill at dawn", { fixedSeed: 1 }).items);
  let n = 0;
  await submitRemaining(c, storage, { shouldStop: () => n++ >= 2 });
  const draft = readDraft(storage, A);
  const subs = c.submissions();
  assert.deepEqual(draft.items.map((i) => typeof i.requestId), ["string", "string", "undefined"]);
  assert.deepEqual(draft.items.slice(0, 2).map((i) => i.requestId).sort(), subs.map((s) => s.requestId).sort());
  assert.deepEqual([...resolveDraft(draft, subs).values()].sort(), subs.map((s) => s.requestId).sort());
  assert.deepEqual(remainingItems(c, storage).map((i) => i.line), [3]);
  // 받았는지 모르는 접수도 이 묶음에 번호가 적히면 다시 맡기지 않는다
  engine.st.loseResponse = isPost;
  const out = await submitRemaining(c, storage);
  engine.st.loseResponse = null;
  assert.equal(out.stopped.kind, "offline");
  assert.deepEqual([out.sent, out.remaining], [1, 0], "보낸 장은 받았는지 몰라도 이 묶음에서 맡긴 것이다");
  assert.equal(c.submissions().find((s) => s.state === "unknown").requestId, posts(engine).at(-1).body.clientRequestId);
  assert.equal(readDraft(storage, A), null, "세 장 모두 접수 번호가 생겨 묶음을 비웠다");
  assert.deepEqual(await submitRemaining(c, storage), { sent: 0, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).length, 3, "unknown 항목을 다시 보내지 않았다");
  assert.equal(engine.st.jobs.length, 3);
});

test("맡기는 도중 접수 번호를 적지 못하고 닫혀도: 묶음 시작 뒤의 같은 내용 접수와 짝지어 다시 보내지 않고, 시작 전 접수와는 짝짓지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const text = "a red apple on a table\na blue bird on a branch";
  // 예전 묶음: 같은 내용·같은 시드가 이미 접수돼 있다
  saveDraft(storage, A, plan(text, { fixedSeed: 9 }).items);
  await submitRemaining(c, storage);
  assert.equal(posts(engine).length, 2);
  // 새 묶음: 첫 장을 맡긴 직후 묶음에 접수 번호를 적지 못함(저장 실패) + 화면이 닫힘
  saveDraft(storage, A, plan(text, { fixedSeed: 9 }).items);
  let n = 0;
  storage.failSet = (k) => k === DRAFT;
  await submitRemaining(c, storage, { shouldStop: () => n++ >= 1 });
  storage.failSet = null;
  assert.equal(posts(engine).length, 3);
  assert.deepEqual(loadDraft(storage, A).map((i) => i.requestId), [undefined, undefined], "번호를 적지 못했다");
  // 다시 열어 이어서 맡기기: 첫 장은 이 묶음에서 이미 맡긴 것(시작 뒤의 접수)으로 보고 둘째 장만 보낸다
  const c2 = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  assert.deepEqual(remainingItems(c2, storage).map((i) => i.line), [2]);
  assert.deepEqual(await submitRemaining(c2, storage), { sent: 1, skipped: 1, remaining: 0 });
  assert.equal(posts(engine).length, 4, "예전 2 + 새 묶음 2 — 새 묶음의 첫 장을 두 번 보내지 않았다");
  assert.equal(new Set(posts(engine).map((x) => x.body.clientRequestId)).size, 4);
  // 한 접수가 두 항목과 짝지어지지 않는다(같은 내용의 항목이 둘이어도)
  const draft = { v: 2, batchId: "b", startedAt: 0, before: [], items: [{ key: "k1", title: "t", prompt: "a b c", seed: 1 }, { key: "k2", title: "t", prompt: "a b c", seed: 1 }] };
  const one = [{ requestId: "req-00000001", title: "t", task: { prompt: "a b c", seed: 1 }, at: 5, state: "accepted" }];
  assert.deepEqual([...resolveDraft(draft, one)], [["k1", "req-00000001"]]);
  // 시작할 때 이미 있던 접수는 시각이 같거나 더 늦게 적혀 있어도 짝짓지 않는다(같은 밀리초에 이어진 접수)
  assert.deepEqual([...resolveDraft({ ...draft, before: ["req-00000001"] }, one)], []);
  assert.deepEqual([...resolveDraft({ ...draft, startedAt: 999, before: [] }, one)], [["k1", "req-00000001"]], "시각이 아니라 번호로 가른다");
});

test("예전 형식의 맡기다 만 묶음(v1)도 읽는다 — 그때의 규칙대로 내용이 같은 접수가 있으면 맡긴 것으로 본다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const items = plan("a red apple on a table\na blue bird on a branch", { fixedSeed: 3 }).items;
  await c.submit((({ line, copy, source, ...rest }) => rest)(items[0]));
  storage.map.set(DRAFT, JSON.stringify({ v: 1, items }));
  assert.equal(readDraft(storage, A).batchId, "legacy");
  assert.deepEqual(remainingItems(c, storage).map((i) => i.line), [2]);
  // 이어 맡기다 멈춰도(접수 번호를 적으며 새 형식으로 다시 적힌 뒤에도) 남은 장을 잃지 않는다
  let stopAt = 0;
  storage.map.set(DRAFT, JSON.stringify({ v: 1, items: [...items, ...plan(["a green hill at dawn", "a small boat on a river"].join("\n"), { fixedSeed: 50 }).items] }));
  const part = await submitRemaining(c, storage, { shouldStop: () => stopAt++ >= 2 });
  assert.deepEqual([part.sent, part.skipped, part.remaining], [1, 1, 2]);
  assert.equal(readDraft(storage, A).before, null, "예전 형식에서 온 묶음이라는 표시가 유지된다");
  assert.equal(readDraft(storage, A).items.filter((i) => i.requestId).length, 1);
  assert.deepEqual(await submitRemaining(c, storage), { sent: 2, skipped: 2, remaining: 0 });
  assert.equal(posts(engine).length, 4);
  assert.equal(new Set(posts(engine).map((p) => p.body.clientRequestId)).size, 4);
  assert.equal(storage.map.has(DRAFT), false);
  // 형식이 어긋난 v2는 읽지 않는다
  for (const bad of [{ v: 2, items }, { v: 2, batchId: "b", startedAt: 1, before: [], items }, { v: 2, batchId: "b", startedAt: "x", before: [], items: items.map((i, k) => ({ ...i, key: `k${k}` })) }, { v: 2, batchId: "b", startedAt: 1, before: [], items: items.map((i) => ({ ...i, key: "same" })) }, { v: 2, batchId: "b", startedAt: 1, before: [], items: [{ ...items[0], key: "k", requestId: "bad id" }] }, { v: 2, batchId: "b", startedAt: 1, items: items.map((i, k) => ({ ...i, key: `k${k}` })) }, { v: 2, batchId: "b", startedAt: 1, before: [1], items: items.map((i, k) => ({ ...i, key: `k${k}` })) }, { v: 3, batchId: "b", startedAt: 1, items }]) {
    storage.map.set(DRAFT, JSON.stringify(bad));
    assert.equal(readDraft(storage, A), null, JSON.stringify(bad).slice(0, 50));
  }
});

test("다른 화면이 맡길 목록을 바꾸면 이어 맡기기를 멈춘다(새 묶음의 항목을 옛 묶음 번호로 보내지 않는다)", async () => {
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
  const src = await readFile(new URL("../src/lib/studio/saveStore.ts", import.meta.url), "utf8");
  assert.match(src, /navigator\?\.locks/);
  assert.match(src, /locks \? locks\.request\(name, fn\) : localLock\(name, fn\)/);
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
  assert.match(jobs, /if \(e\.key === "Escape"\) setConfirmReplace\(null\);/);
  assert.match(jobs, /opener\.current\?\.focus\(\);/, "닫히면 연 버튼으로 포커스 복귀");
  assert.match(jobs, /document\.removeEventListener\("keydown", onKey\);/);
  assert.match(jobs, /role="alertdialog" aria-modal="false" aria-labelledby="replace-title" aria-describedby="replace-desc"/);
  assert.match(jobs, /<button type="button" ref=\{cancelButton\}/);
  assert.match(jobs, /\}, \[confirmReplace\]\);/);
});
