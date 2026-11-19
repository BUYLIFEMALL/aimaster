import test from "node:test";
import assert from "node:assert/strict";
import { EngineError, IMAGE_SIZES, createEngineClient } from "../src/lib/engine.ts";
import { PRESETS, SIZE_CHOICES, buildPrompt, findPreset, pickVariantId, withKoreanDefault } from "../src/lib/studio/presets.ts";
import { BATCH_MAX, buildPlan, clearDraft, dropFromDraft, loadDraft, parseLines, remainingItems, saveDraft, submitRemaining } from "../src/lib/studio/batch.ts";
import { PHASE_LABEL, again, buildRows, cancelAll, replace, restart, summarize } from "../src/lib/studio/jobsView.ts";
import { createSaveStore, fileNameFor } from "../src/lib/studio/saveStore.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const kind = (k) => (e) => e instanceof EngineError && e.kind === k;
const isPost = (call) => call.method === "POST" && call.path === "/queue";
const posts = (engine) => engine.st.calls.filter(isPost);
const photo = findPreset("photo");
const lines = (n, prefix = "a quiet street scene number") => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`).join("\n");
const plan = (text, over = {}) => buildPlan({ text, preset: photo, width: 1280, height: 720, copies: 1, ...over });
const ctxOf = (c) => ({ inScope: (id) => c.inCurrentScope(id), canResend: (id) => c.canResend(id) });
const rowsOf = async (c) => buildRows(c.submissions(), await c.listJobs(), ctxOf(c));
async function paired(engine, storage = memoryStorage(), memberId = A) {
  const c = createEngineClient({ memberId, storage, fetch: engine.fetch });
  await c.pair(engine.st.codes[0]);
  return { c, storage };
}
async function start(engine, c, storage, text, over) {
  const p = plan(text, over);
  assert.deepEqual(p.errors, []);
  saveDraft(storage, c.memberId, p.items);
  return { p, run: await submitRemaining(c, storage) };
}

test("프리셋: 네 가지 용도, 영문 틀, 사람은 기본 한국인, 크기는 엔진 허용 세 가지", () => {
  assert.deepEqual(PRESETS.map((p) => p.id), ["photo", "product", "thumbnail", "illustration"]);
  assert.equal(findPreset("photo").family, "z-image-turbo");
  for (const id of ["product", "thumbnail", "illustration"]) assert.equal(findPreset(id).family, "flux2-klein-4b");
  for (const p of PRESETS) {
    assert.match(p.frame, /\{subject\}/);
    assert.ok(!/[^\x20-\x7e]/.test(p.frame + p.example), "틀과 예시는 영문만");
    assert.match(p.frame, /no text/);
    const built = buildPrompt(p, `  ${p.example}.  `);
    assert.ok(built.startsWith(p.example) && !built.includes("{subject}") && !built.includes(".,"));
  }
  assert.deepEqual(SIZE_CHOICES.map((s) => [s.width, s.height]).sort(), IMAGE_SIZES.map(([w, h]) => [w, h]).sort());
  assert.equal(withKoreanDefault("a woman reading a book"), "a woman reading a book, Korean people");
  for (const stated of ["a French woman in Paris", "two Japanese students in Tokyo", "a tourist couple in Italy", "an Egyptian man near the pyramids", "a blonde girl on a beach", "a family in Thailand"]) assert.equal(withKoreanDefault(stated), stated, "나라·지역을 밝힌 설명은 그대로");
  assert.equal(withKoreanDefault("a chef cooking in a small kitchen"), "a chef cooking in a small kitchen, Korean people");
  assert.equal(withKoreanDefault("an American family at a barbecue"), "an American family at a barbecue");
  assert.equal(withKoreanDefault("a Korean chef in a kitchen"), "a Korean chef in a kitchen");
  assert.equal(withKoreanDefault("a red apple on a table"), "a red apple on a table");
  assert.equal(findPreset("nope"), null);
});

test("모델 구성 고르기: 엔진의 판단을 그대로 따른다", () => {
  const v = (id, over = {}) => ({ id, family: id.split(":")[0], status: "available", ...over });
  const models = (flux, z, extra = {}) => ({ families: [{ id: "z-image-turbo", variants: z }, { id: "flux2-klein-4b", variants: flux }], ...extra });
  assert.equal(pickVariantId(models([v("flux2-klein-4b:q4_0"), v("flux2-klein-4b:q8_0", { familyRecommended: true })], []), "flux2-klein-4b"), "flux2-klein-4b:q8_0");
  assert.equal(pickVariantId(models([v("flux2-klein-4b:q4_0"), v("flux2-klein-4b:q8_0")], [], { recommendedId: "flux2-klein-4b:q8_0" }), "flux2-klein-4b"), "flux2-klein-4b:q8_0");
  assert.equal(pickVariantId(models([v("flux2-klein-4b:q4_0"), v("flux2-klein-4b:q8_0")], [], { installed: ["flux2-klein-4b:q8_0"] }), "flux2-klein-4b"), "flux2-klein-4b:q8_0");
  assert.equal(pickVariantId(models([v("flux2-klein-4b:q4_0", { status: "unavailable" }), v("flux2-klein-4b:q8_0", { status: "slow" })], []), "flux2-klein-4b"), "flux2-klein-4b:q8_0");
  assert.equal(pickVariantId(models([v("flux2-klein-4b:q4_0", { status: "unavailable", familyRecommended: true })], []), "flux2-klein-4b"), null, "쓸 수 없다고 한 구성은 고르지 않는다");
  assert.equal(pickVariantId(models([v("flux2-klein-4b:q8_0", { familyRecommended: true })], [], { recommendedId: "flux2-klein-4b:q8_0" }), "z-image-turbo"), null, "다른 가족의 추천을 가져오지 않는다");
  for (const bad of [null, undefined, {}, { families: null }, { families: [{ id: "flux2-klein-4b" }] }]) assert.equal(pickVariantId(bad, "flux2-klein-4b"), null);
});

test("묶음 계획: 한 줄이 한 요청, 총 24장까지 — 넘으면 한 장도 맡기지 않는다", () => {
  assert.deepEqual(parseLines("  a b  c \r\n\n\n d e\n   \n"), ["a b c", "d e"]);
  assert.equal(BATCH_MAX, 24);
  const ok24 = plan(lines(24));
  assert.equal(ok24.items.length, 24);
  assert.deepEqual(ok24.errors, []);
  const ok12x2 = plan(lines(12), { copies: 2 });
  assert.equal(ok12x2.items.length, 24);
  assert.deepEqual(ok12x2.items.slice(0, 2).map((i) => [i.line, i.copy, i.title]), [[1, 1, "실사·블로그 1번-1"], [1, 2, "실사·블로그 1번-2"]]);
  for (const [text, over, total] of [[lines(25), {}, 25], [lines(13), { copies: 2 }, 26], [lines(24), { copies: 2 }, 48]]) {
    const p = plan(text, over);
    assert.equal(p.total, total);
    assert.deepEqual(p.items, [], `${total}장은 통째로 막는다`);
    assert.match(p.errors[0].message, new RegExp(`24장까지.*지금 ${total}장`));
  }
  assert.equal(plan("").errors[0].line, 0);
  assert.equal(plan("\n \n").items.length, 0);
  // 장수는 1~2만(그 밖의 값은 1)
  for (const copies of [0, 3, 1.5, "2", null]) assert.equal(plan(lines(2), { copies }).items.length, 2);
  // 항목 내용
  const [item] = plan("a red apple on a wooden table", { variantId: "z-image-turbo:q8_0" }).items;
  assert.equal(item.prompt, buildPrompt(photo, "a red apple on a wooden table"));
  assert.deepEqual([item.width, item.height, item.variantId, item.source], [1280, 720, "z-image-turbo:q8_0", "a red apple on a wooden table"]);
  assert.ok(Number.isInteger(item.seed) && item.seed >= 0 && item.seed <= 2147483647);
  assert.equal("variantId" in plan("a red apple").items[0], false, "구성을 고르지 않으면 그 칸을 싣지 않는다(엔진이 정함)");
  // 묶음 안의 시드는 서로 다르다(같은 값이 나와도 다시 뽑는다)
  let n = 0;
  const seeds = plan(lines(6), { copies: 2, random: () => [5, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16][n++] }).items.map((i) => i.seed);
  assert.equal(new Set(seeds).size, 12);
  // 고급: 시드를 정하면 장마다 1씩 늘린다
  assert.deepEqual(plan(lines(2), { copies: 2, fixedSeed: 100 }).items.map((i) => i.seed), [100, 101, 102, 103]);
  assert.deepEqual(plan(lines(2), { fixedSeed: 2147483647 }).items.map((i) => i.seed), [2147483647, 0]);
  for (const fixedSeed of [-1, 1.5, 2147483648]) assert.equal(plan(lines(2), { fixedSeed }).items.length, 0);
});

test("묶음 계획: 한글·짧은 줄·너무 긴 줄은 줄 번호와 함께 막는다(엔진에 그대로 보내지 않는다)", () => {
  const p = plan(["a calm lake at sunrise", "빨간 사과 한 개", "apple", "a red 사과 on a table", `${"very ".repeat(190)}long`].join("\n"));
  assert.deepEqual(p.items, []);
  assert.deepEqual(p.errors.map((e) => e.line), [2, 3, 4, 5]);
  assert.match(p.errors[0].message, /영문으로/);
  assert.match(p.errors[1].message, /두 단어 이상/);
  assert.match(p.errors[2].message, /영문으로/);
  assert.match(p.errors[3].message, /900자/);
  // 장수가 2여도 같은 줄의 오류는 한 번만
  assert.equal(plan("빨간 사과\na calm lake", { copies: 2 }).errors.length, 1);
});

test("일괄 시작: 하나씩 맡기고, 끝나면 보관한 묶음을 지운다 — 엔진 작업 수 = 계획 장수", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const progress = [];
  const p = plan(lines(24));
  saveDraft(storage, A, p.items);
  const run = await submitRemaining(c, storage, { onProgress: (d, t) => progress.push([d, t]) });
  assert.deepEqual(run, { sent: 24, skipped: 0, remaining: 0 });
  assert.deepEqual(progress.at(-1), [24, 24]);
  assert.equal(progress.length, 24);
  assert.equal(engine.st.jobs.length, 24);
  assert.equal(new Set(engine.st.jobs.map((j) => j.clientRequestId)).size, 24);
  assert.deepEqual(loadDraft(storage, A), []);
  // 다시 눌러도(보관한 묶음이 없음) 아무것도 보내지 않는다
  assert.deepEqual(await submitRemaining(c, storage), { sent: 0, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).length, 24);
  const rows = await rowsOf(c);
  assert.equal(rows.length, 24);
  assert.ok(rows.every((r) => r.phase === "queued" && r.actions.join() === "cancel"));
  assert.deepEqual(summarize(rows), { total: 24, done: 0, active: 24, failed: 0, needCheck: 0 });
});

test("새로고침 뒤 같은 범위 복원: 새 화면(같은 저장소)에서 줄·작업이 그대로 보이고, 남은 장만 이어서 맡긴다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const p = plan(lines(6));
  saveDraft(storage, A, p.items);
  let n = 0;
  const first = await submitRemaining(c, storage, { shouldStop: () => n++ >= 3 }); // 세 장 맡긴 뒤 화면이 닫힘
  assert.deepEqual(first, { sent: 3, skipped: 0, remaining: 3, stopped: { kind: "user", message: "맡기기를 멈췄습니다." } });
  c.dispose();
  // 새로고침: 같은 회원·같은 저장소로 화면을 다시 만든다
  const c2 = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  assert.equal(c2.isPaired(), true);
  const before = await rowsOf(c2);
  assert.deepEqual(before.map((r) => r.title).sort(), ["실사·블로그 1번", "실사·블로그 2번", "실사·블로그 3번"]);
  assert.ok(before.every((r) => r.phase === "queued" && r.inScope));
  assert.equal(remainingItems(c2, storage).length, 3);
  const second = await submitRemaining(c2, storage);
  assert.deepEqual(second, { sent: 3, skipped: 3, remaining: 0 });
  assert.equal(engine.st.jobs.length, 6, "이미 맡긴 세 장을 다시 보내지 않았다");
  assert.equal(new Set(posts(engine).map((x) => `${x.body.title}|${x.body.task.seed}`)).size, 6);
  assert.deepEqual(loadDraft(storage, A), []);
  assert.equal((await rowsOf(c2)).length, 6);
});

test("미확정 자동 재접수 0: 받았는지 모르는 줄은 이어 맡기기·다시 열기·목록 갱신 어디서도 다시 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const p = plan(lines(4));
  saveDraft(storage, A, p.items);
  // 두 번째 장: 엔진은 받았고 응답만 잃음. 세 번째 장: 엔진이 꺼져 닿지 못함
  let i = 0;
  engine.st.loseResponse = (call) => isPost(call) && ++i === 2;
  const run1 = await submitRemaining(c, storage);
  engine.st.loseResponse = null;
  assert.equal(run1.stopped.kind, "offline", "응답을 못 받으면 거기서 멈춘다");
  assert.deepEqual([run1.sent, run1.remaining], [2, 2]);
  assert.equal(engine.st.jobs.length, 2);
  const unknown = c.submissions().find((s) => s.state === "unknown");
  assert.ok(unknown);
  // 이어서 맡기기를 여러 번 눌러도 unknown 줄은 건너뛴다
  const run2 = await submitRemaining(c, storage);
  assert.deepEqual(run2, { sent: 2, skipped: 2, remaining: 0 });
  assert.equal(posts(engine).filter((x) => x.body.task.seed === unknown.task.seed).length, 1);
  assert.equal(engine.st.jobs.length, 4);
  // 화면을 다시 열고 목록을 여러 번 만들어도 엔진에 쓰는 요청이 없다
  const c2 = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  const n = engine.st.calls.length;
  for (let k = 0; k < 3; k++) {
    const rows = await rowsOf(c2);
    const row = rows.find((r) => r.requestId === unknown.requestId);
    assert.equal(row.phase, "unknown");
    assert.deepEqual(row.actions, ["confirm", "replace", "discard"]);
  }
  assert.ok(engine.st.calls.slice(n).every((call) => call.method === "GET"), "목록 읽기뿐");
  assert.equal(posts(engine).length, 4);
  // 사용자가 「확인」을 누르면 같은 접수 번호를 찾아 접수됨
  assert.equal((await c2.confirm(unknown.requestId)).state, "accepted");
  assert.equal((await rowsOf(c2)).find((r) => r.requestId === unknown.requestId).phase, "queued");
  assert.equal(engine.st.jobs.length, 4);
});

test("받았는지 모르는 줄을 기록에서 지우면 맡기다 만 묶음에서도 그 접수 번호의 장이 빠진다 — 이어서 맡기기로 되살아나지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  saveDraft(storage, A, plan(lines(3)).items);
  // 첫 장: 엔진은 받았고 응답만 잃음 → 묶음이 멈춘다
  let i = 0;
  engine.st.loseResponse = (call) => isPost(call) && ++i === 1;
  const run = await submitRemaining(c, storage);
  engine.st.loseResponse = null;
  assert.deepEqual([run.sent, run.remaining], [1, 2]);
  const unknown = c.submissions()[0];
  assert.equal(unknown.state, "unknown");
  assert.equal(loadDraft(storage, A)[0].requestId, unknown.requestId, "묶음의 첫 장에 적어 둔 접수 번호로 맡겼다");
  // 사용자가 그 줄을 기록에서 지운다(화면의 「기록에서 지우기」와 같은 순서)
  assert.equal(c.forget(unknown.requestId, { force: true }), true);
  assert.equal(remainingItems(c, storage).length, 2, "기록을 지워도 보내려 한 표시가 남아 있어 「보낸 적 없는 장」으로 되살아나지 않는다");
  assert.equal(loadDraft(storage, A)[0].tried > 0, true);
  dropFromDraft(storage, A, unknown.requestId);
  assert.deepEqual(loadDraft(storage, A).map((it) => it.line), [2, 3]);
  assert.deepEqual(await submitRemaining(c, storage), { sent: 2, skipped: 0, remaining: 0 });
  assert.equal(posts(engine).filter((x) => x.body.clientRequestId === unknown.requestId).length, 1, "지운 그림을 다시 보내지 않았다");
  assert.equal(engine.st.jobs.length, 3);
  // 묶음에 없는 접수 번호를 넘기면 묶음은 그대로, 마지막 장을 빼면 묶음이 비워진다
  saveDraft(storage, A, plan("a lone tree on a hill").items);
  dropFromDraft(storage, A, unknown.requestId);
  dropFromDraft(storage, A, "no-such-request");
  assert.equal(loadDraft(storage, A).length, 1);
  dropFromDraft(storage, A, loadDraft(storage, A)[0].requestId);
  assert.equal(storage.map.has(`fis.draft.v1:${A}`), false);
});

test("받았는지 모르는 줄을 새로 맡기기: 사용자가 중복 가능성을 확인했을 때만, 새 접수 번호로 한 번", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  engine.st.unreachable = isPost;
  await start(engine, c, storage, lines(1)).catch(() => {});
  engine.st.unreachable = null;
  const old = c.submissions()[0];
  assert.equal(old.state, "unknown");
  assert.deepEqual(await c.confirm(old.requestId), { state: "unknown", reason: "notListed" });
  await assert.rejects(replace(c, old.requestId, false), kind("invalid"));
  await assert.rejects(replace(c, old.requestId, undefined), kind("invalid"));
  assert.equal(posts(engine).length, 1, "확인 없이는 보내지 않는다");
  const res = await replace(c, old.requestId, true);
  assert.equal(res.state, "accepted");
  assert.notEqual(res.requestId, old.requestId);
  assert.deepEqual(c.submissions().map((s) => s.requestId), [res.requestId], "옛 기록은 지우고 새 기록만");
  assert.deepEqual(posts(engine).at(-1).body.task, old.task, "내용은 그대로");
  assert.equal(engine.st.jobs.length, 1);
  // 접수된 줄·거절된 줄에는 쓸 수 없다
  await assert.rejects(replace(c, res.requestId, true), kind("invalid"));
  // 새로 맡기기도 응답을 잃으면 옛 기록은 지워지고 새 기록이 unknown으로 남는다(기록이 하나는 반드시 남는다)
  engine.st.unreachable = isPost;
  const r2 = await c.submit({ title: "t", prompt: "a calm lake at dawn", seed: 1 });
  const r3 = await replace(c, r2.requestId, true);
  engine.st.unreachable = null;
  assert.equal(r3.state, "unknown");
  assert.deepEqual(c.submissions().map((s) => s.requestId).sort(), [res.requestId, r3.requestId].sort());
});

test("사용자가 요청한 취소: 한 줄 취소와 「모두 멈추기」 — 자기 작업만, 접수 기록은 그대로", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  await start(engine, c, storage, lines(5));
  let rows = await rowsOf(c);
  engine.st.jobs[0].status = "running";
  engine.finish(engine.st.jobs[1].id);
  // 한 줄 취소
  const target = rows.find((r) => r.title === "실사·블로그 3번");
  await c.cancel(target.jobId);
  rows = await rowsOf(c);
  assert.equal(rows.find((r) => r.requestId === target.requestId).phase, "cancelled");
  // 다른 회원의 작업이 같은 엔진에 있어도 건드리지 않는다
  const other = await paired(engine, memoryStorage(), B);
  const theirs = await other.c.submit({ title: "남의 그림", prompt: "a blue bird on a branch" });
  // 모두 멈추기
  const out = await cancelAll(c);
  assert.deepEqual(out, { cancelled: 3, failed: 0 }, "대기 2 + 그리는 중 1");
  rows = await rowsOf(c);
  assert.deepEqual(rows.map((r) => r.phase).sort(), ["cancelled", "cancelled", "cancelled", "cancelled", "done"]);
  assert.equal(engine.st.jobs.find((j) => j.id === theirs.job.id).status, "queued", "남의 작업은 그대로");
  assert.equal(c.submissions().length, 5, "취소해도 접수 기록은 남는다");
  assert.equal(posts(engine).length, 6, "멈춘다고 새로 넣지 않는다");
  // 취소 중 일부가 실패해도 나머지는 계속한다
  const e2 = createMockEngine();
  const p2 = await paired(e2);
  await start(e2, p2.c, p2.storage, lines(3));
  let k = 0;
  e2.st.override = (call) => (call.path.endsWith("/cancel") && ++k === 2 ? new Response(JSON.stringify({ error: "그 작업을 찾지 못했습니다." }), { status: 404 }) : null);
  assert.deepEqual(await cancelAll(p2.c), { cancelled: 2, failed: 1 });
});

test("확정 실패 재시작: 엔진 목록에서 실패·중단·취소가 확인된 줄만, 사용자가 눌렀을 때 새 접수 번호로", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  await start(engine, c, storage, lines(4));
  const [j1, j2, j3, j4] = engine.st.jobs;
  engine.finish(j1.id, "failed");
  engine.finish(j2.id, "interrupted");
  engine.finish(j3.id, "done");
  let jobs = await c.listJobs();
  let rows = buildRows(c.submissions(), jobs, ctxOf(c));
  const row = (j) => rows.find((r) => r.jobId === j.id);
  assert.deepEqual(row(j1).actions, ["restart", "dismiss"]);
  assert.deepEqual(row(j2).actions, ["restart", "dismiss"]);
  assert.deepEqual(row(j3).actions, ["save", "again", "dismiss"]);
  assert.deepEqual(row(j4).actions, ["cancel"]);
  // 목록을 만들기만 해서는 다시 시작하지 않는다
  assert.equal(posts(engine).length, 4);
  const r1 = await restart(c, row(j1).requestId);
  assert.equal(r1.state, "accepted");
  assert.notEqual(r1.requestId, row(j1).requestId);
  assert.deepEqual(posts(engine).at(-1).body.task, j1.task, "같은 내용(같은 시드)");
  assert.equal(engine.st.jobs.length, 5);
  // 실패가 확인되지 않은 줄은 다시 시작할 수 없다: 완료·대기 중·받았는지 모름·목록에 없음
  await assert.rejects(restart(c, row(j3).requestId), kind("invalid"));
  await assert.rejects(restart(c, row(j4).requestId), kind("invalid"));
  const kept = engine.st.jobs;
  engine.st.jobs = kept.filter((j) => j.id !== j2.id);
  await assert.rejects(restart(c, row(j2).requestId), kind("invalid"), "지금 엔진 목록에서 확인되지 않으면 안 된다");
  engine.st.jobs = kept;
  engine.st.loseResponse = isPost;
  const lost = await c.submit({ title: "유실", prompt: "a small boat on a river", seed: 7 });
  engine.st.loseResponse = null;
  jobs = await c.listJobs();
  await assert.rejects(restart(c, lost.requestId), kind("invalid"), "받았는지 모르는 접수는 다시 시작이 아니라 확인부터");
  await assert.rejects(restart(c, "no-such-request"), kind("invalid"));
  assert.equal(posts(engine).length, 6);
  // 완료된 그림 「다시 만들기」는 시드만 바꾼다
  const a = await again(c, row(j3).requestId);
  const sent = posts(engine).at(-1).body.task;
  assert.equal(a.state, "accepted");
  assert.notEqual(sent.seed, j3.task.seed);
  assert.deepEqual({ ...sent, seed: 0 }, { ...j3.task, seed: 0 });
  assert.equal(engine.st.jobs.find((j) => j.id === j3.id).status, "done", "원래 그림은 그대로");
});

test("작업 기록 줄: 상태마다 고를 수 있는 동작이 정해져 있고, 엔진 목록을 못 읽으면 동작을 주지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  await start(engine, c, storage, lines(2));
  engine.st.override = (call) => (isPost(call) ? new Response(JSON.stringify({ error: "잠시 뒤 다시 시도해 주세요." }), { status: 429 }) : null);
  const busy = await c.submit({ title: "바쁨", prompt: "a calm lake at dawn", seed: 1 });
  engine.st.override = (call) => (isPost(call) ? new Response(JSON.stringify({ error: "시드 값이 올바르지 않습니다." }), { status: 400 }) : null);
  const invalid = await c.submit({ title: "거절", prompt: "a calm lake at dusk", seed: 2 });
  engine.st.override = null;
  const subs = c.submissions();
  const jobs = await c.listJobs();
  const rows = buildRows(subs, jobs, ctxOf(c));
  const by = (id) => rows.find((r) => r.requestId === id);
  assert.deepEqual(by(busy.requestId).actions, ["resend", "discard"]);
  assert.equal(by(busy.requestId).error, "잠시 뒤 다시 시도해 주세요.");
  assert.deepEqual(by(invalid.requestId).actions, ["discard"], "내용 문제로 거절된 줄은 다시 보내기가 없다");
  assert.ok(rows[0].at >= rows.at(-1).at, "새 접수가 위");
  // 엔진 목록을 못 읽음(꺼짐 등)
  const offline = buildRows(subs, null, ctxOf(c));
  assert.ok(offline.filter((r) => subs.find((s) => s.requestId === r.requestId).state === "accepted").every((r) => r.phase === "waiting" && r.actions.length === 0));
  // 접수됐는데 목록에 없음
  const gone = buildRows(subs, [], ctxOf(c)).filter((r) => r.phase === "gone");
  assert.equal(gone.length, 2);
  assert.ok(gone.every((r) => r.actions.join() === "discard"));
  // 처리 중인 줄에는 버튼이 없다
  assert.deepEqual(buildRows(subs, jobs, { ...ctxOf(c), busy: (id) => id === busy.requestId }).find((r) => r.requestId === busy.requestId).actions, []);
  // 모든 상태에 한국어 이름이 있다
  for (const r of [...rows, ...offline, ...gone]) assert.ok(PHASE_LABEL[r.phase]);
  assert.deepEqual(summarize(rows), { total: 4, done: 0, active: 2, failed: 2, needCheck: 0 });
});

test("회원 변경: 앞 회원의 줄·맡길 묶음·저장 기록·엔진 작업이 다음 회원에게 보이지 않는다", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage(); // 같은 브라우저
  const a = await paired(engine, storage, A);
  const p = plan(lines(3));
  saveDraft(storage, A, p.items);
  let n = 0;
  await submitRemaining(a.c, storage, { shouldStop: () => n++ >= 2 }); // 한 장은 아직 맡기지 않음
  const saveA = createSaveStore(storage, A);
  engine.finish(engine.st.jobs[0].id);
  const rowA = (await rowsOf(a.c)).find((r) => r.phase === "done");
  await saveA.saveOnce(rowA, () => a.c.fetchArt(rowA.jobId), async () => {});
  a.c.dispose();

  const b = createEngineClient({ memberId: B, storage, fetch: engine.fetch });
  assert.deepEqual(b.submissions(), []);
  assert.deepEqual(loadDraft(storage, B), [], "A가 맡기다 만 묶음이 B에게 넘어가지 않는다");
  assert.equal(createSaveStore(storage, B).savedInfo(rowA.requestId), null);
  assert.deepEqual(buildRows(b.submissions(), null, ctxOf(b)), []);
  // B가 「이어서 맡기기」를 눌러도 A의 남은 장을 보내지 않는다
  await b.pair(engine.st.codes[0]);
  assert.deepEqual(await submitRemaining(b, storage), { sent: 0, skipped: 0, remaining: 0 });
  assert.deepEqual(await b.listJobs(), []);
  assert.equal(engine.st.jobs.length, 2);
  await assert.rejects(b.fetchArt(rowA.jobId), kind("notFound"));
  await assert.rejects(restart(b, rowA.requestId), kind("invalid"));
  // A가 돌아오면 자기 것이 그대로
  const a2 = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  assert.equal((await rowsOf(a2)).length, 2);
  assert.equal(loadDraft(storage, A).length, 3);
  assert.equal(remainingItems(a2, storage).length, 1);
  assert.ok(saveA.savedInfo(rowA.requestId));
  // 앞 회원의 화면이 남긴 늦은 응답은 버려진다
  await assert.rejects(a.c.listJobs(), kind("stale"));
});

test("결과 중복 저장 방어: 같은 그림은 한 번만 쓰고, 동시에 두 번 눌러도 한 번, 다시 저장은 같은 이름으로", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  await start(engine, c, storage, lines(2));
  engine.st.jobs.forEach((j) => engine.finish(j.id));
  const rows = await rowsOf(c);
  const store = createSaveStore(storage, A);
  const written = [];
  const write = async (name, blob) => void written.push([name, blob.type, blob.size]);
  const load = (row) => () => c.fetchArt(row.jobId);
  const [r1, r2] = rows;
  assert.equal(fileNameFor(r1), `실사·블로그-${r1.title.endsWith("1번") ? 1 : 2}번-1280x720-${r1.requestId.replace(/-/g, "").slice(0, 8)}.png`);
  assert.notEqual(fileNameFor(r1), fileNameFor(r2), "그림마다 이름이 다르다");
  assert.equal(fileNameFor({ requestId: "abcd1234-xx", title: 'a/b\\c:*?"<>|' }), "abc-abcd1234.png");

  const first = await store.saveOnce(r1, load(r1), write);
  assert.equal(first.saved, true);
  assert.equal(first.info.name, fileNameFor(r1));
  const fetches = () => engine.st.calls.filter((x) => x.path.startsWith("/image-art/")).length;
  const n = fetches();
  const second = await store.saveOnce(r1, load(r1), write);
  assert.deepEqual(second, { saved: false, info: first.info });
  assert.equal(written.length, 1, "두 번째에는 쓰지 않는다");
  assert.equal(fetches(), n, "그림을 다시 받지도 않는다");
  // 동시에 두 번
  const both = await Promise.all([store.saveOnce(r2, load(r2), write), store.saveOnce(r2, load(r2), write)]);
  assert.deepEqual(both.map((x) => x.saved).sort(), [false, true], "둘째는 첫째가 끝난 뒤 기록을 보고 쓰지 않는다");
  assert.equal(both[0].info.name, both[1].info.name);
  assert.equal(written.length, 2);
  // 새로고침 뒤(새 저장 기록 객체)에도 기억한다
  const store2 = createSaveStore(storage, A);
  assert.equal((await store2.saveOnce(r2, load(r2), write)).saved, false);
  assert.equal(written.length, 2);
  // 사용자가 「다시 저장」을 고르면 같은 이름으로 한 번 더 쓴다(폴더에서는 같은 파일을 덮어씀)
  const forced = await store2.saveOnce(r1, load(r1), write, { force: true });
  assert.equal(forced.saved, true);
  assert.equal(written.at(-1)[0], first.info.name);
  assert.equal(new Set(written.map((w) => w[0])).size, 2, "파일 이름은 여전히 두 개");
  // 쓰기에 실패하면 저장했다고 적지 않는다
  const e3 = createMockEngine();
  const p3 = await paired(e3);
  await start(e3, p3.c, p3.storage, lines(1));
  e3.finish(e3.st.jobs[0].id);
  const [row3] = await rowsOf(p3.c);
  const store3 = createSaveStore(p3.storage, A);
  await assert.rejects(store3.saveOnce(row3, () => p3.c.fetchArt(row3.jobId), async () => Promise.reject(new Error("권한 없음"))), /권한 없음/);
  assert.equal(store3.savedInfo(row3.requestId), null);
  assert.equal(store3.isSaving(row3.requestId), false);
  assert.equal((await store3.saveOnce(row3, () => p3.c.fetchArt(row3.jobId), write)).saved, true);
  // 그림을 받지 못하면(남의 작업·지워짐) 쓰지 않는다
  await assert.rejects(store3.saveOnce({ requestId: "other-request-0001", title: "x" }, () => p3.c.fetchArt("00000000-0000-4000-8000-000000000000"), write), kind("notFound"));
  // 지우면 저장 기록도 지운다
  store3.forget(row3.requestId);
  assert.equal(store3.savedInfo(row3.requestId), null);
  assert.throws(() => createSaveStore(memoryStorage(), ""), kind("invalid"));
});

test("맡길 묶음 보관: 회원별, 장마다 접수 번호를 미리 적고, 손상된 내용은 엔진에 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const p = plan(lines(3));
  const draft = saveDraft(storage, A, p.items);
  assert.deepEqual(loadDraft(storage, A).map(({ key, requestId, ...rest }) => rest), p.items);
  assert.equal(new Set(draft.items.map((it) => it.key)).size, 3, "장마다 고유 번호");
  assert.equal(new Set(draft.items.map((it) => it.requestId)).size, 3, "장마다 접수 번호를 미리 정한다");
  assert.ok(draft.items.every((it) => /^[A-Za-z0-9-]{8,64}$/.test(it.requestId)));
  assert.equal(draft.link, c.scopeId(), "묶음은 만든 때의 연결 범위에 묶인다");
  assert.equal(posts(engine).length, 0, "묶음을 보관하는 것만으로는 엔진에 보내지 않는다");
  assert.deepEqual(loadDraft(storage, B), []);
  const key = `fis.draft.v1:${A}`;
  const good = JSON.parse(storage.map.get(key));
  const item = good.items[0];
  for (const bad of ["{broken", "null", { ...good, v: 4 }, { ...good, items: "x" }, { ...good, batchId: "" }, { ...good, link: "" }, { ...good, link: undefined }, { ...good, startedAt: "x" }, { ...good, items: [{ ...item, prompt: "한글 설명입니다 요" }] }, { ...good, items: [{ ...item, width: 999 }] }, { ...good, items: [{ ...item, seed: "1" }] }, { ...good, items: [{ ...item, requestId: undefined }] }, { ...good, items: [{ ...item, requestId: "bad id" }] }, { ...good, items: [item, { ...good.items[1], requestId: item.requestId }] }, { ...good, items: [item, { ...good.items[1], key: item.key }] }, { ...good, items: Array.from({ length: 25 }, (_, k) => ({ ...item, key: `k${k}`, requestId: `req-${String(k).padStart(8, "0")}` })) }]) {
    storage.map.set(key, typeof bad === "string" ? bad : JSON.stringify(bad));
    assert.deepEqual(loadDraft(storage, A), [], JSON.stringify(bad).slice(0, 60));
    assert.deepEqual(await submitRemaining(c, storage), { sent: 0, skipped: 0, remaining: 0 });
  }
  assert.equal(posts(engine).length, 0);
  clearDraft(storage, A);
  storage.failSet = (k) => k === key;
  assert.throws(() => saveDraft(storage, A, p.items), kind("storage"));
});

test("연결이 필요하거나 엔진이 닫혔으면 묶음을 멈추고 남은 장을 보관한다(다음에 이어서)", async () => {
  // 연결 안 됨: 묶음 자체를 만들지 않는다(어느 연결의 묶음인지 적을 수 없다)
  let engine = createMockEngine();
  let storage = memoryStorage();
  let c = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  assert.throws(() => saveDraft(storage, A, plan(lines(3)).items), kind("needPair"));
  assert.equal(storage.map.size, 0);
  assert.equal(engine.st.calls.length, 0);
  await c.pair(engine.st.codes[0]);
  saveDraft(storage, A, plan(lines(3)).items);
  // 맡기는 도중 엔진이 토큰을 무효로 함(401): 그 장은 「접수 안 됨」, 나머지는 보내지 않는다
  engine.st.tokens = [];
  let run = await submitRemaining(c, storage);
  assert.equal(run.stopped.kind, "needPair");
  assert.deepEqual([run.sent, run.remaining], [1, 2]);
  assert.equal(posts(engine).length, 1);
  assert.equal(c.isPaired(), false);
  // 중간에 엔진이 닫힘(503): 그 장은 「접수 안 됨」으로 남고 나머지는 보내지 않는다
  engine = createMockEngine();
  ({ c, storage } = await paired(engine));
  saveDraft(storage, A, plan(lines(4)).items);
  let k = 0;
  engine.st.override = (call) => (isPost(call) && ++k >= 2 ? new Response(JSON.stringify({ error: "작업 기록 파일을 읽지 못해 이 사이트의 작업을 멈췄습니다(읽기 실패). 엔진 창을 확인해 주세요." }), { status: 503 }) : null);
  run = await submitRemaining(c, storage);
  engine.st.override = null;
  assert.equal(run.stopped.kind, "closed");
  assert.deepEqual([run.sent, run.remaining], [2, 2]);
  assert.equal(posts(engine).length, 2, "닫힌 뒤에는 더 보내지 않았다");
  const rejected = c.submissions().find((s) => s.state === "rejected");
  assert.equal(c.canResend(rejected.requestId), true);
  // 엔진이 풀린 뒤: 거절된 장은 같은 번호로 다시 보내고, 남은 장은 이어서 맡긴다 — 모두 4장
  assert.equal((await c.resend(rejected.requestId)).state, "accepted");
  assert.deepEqual(await submitRemaining(c, storage), { sent: 2, skipped: 2, remaining: 0 });
  assert.equal(engine.st.jobs.length, 4);
  assert.equal(new Set(engine.st.jobs.map((j) => j.clientRequestId)).size, 4);
});
