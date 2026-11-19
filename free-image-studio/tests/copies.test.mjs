// 줄마다 장수(1~2)와 합계 24장 — 플랜 4-2절 계약. 모의 엔진으로 접수까지 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEngineClient } from "../src/lib/engine.ts";
import { findPreset } from "../src/lib/studio/presets.ts";
import { BATCH_MAX, COPIES_MAX, buildPlan, loadCompose, loadDraft, parseEntries, parseLines, remainingItems, saveCompose, saveDraft, setLineCopies, submitRemaining } from "../src/lib/studio/batch.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const photo = findPreset("photo");
const plan = (text, over = {}) => buildPlan({ text, preset: photo, width: 1280, height: 720, ...over });
/** n줄 가운데 앞의 twos줄만 2장 */
const mixed = (n, twos) => Array.from({ length: n }, (_, i) => `a quiet street scene number ${i + 1}${i < twos ? " x2" : ""}`).join("\n");
const isPost = (call) => call.method === "POST" && call.path === "/queue";

test("줄 끝의 장수 표시: 기본은 1장, x2·×2·*2는 2장, 그 밖의 숫자는 그 줄의 오류", () => {
  assert.equal(COPIES_MAX, 2);
  assert.deepEqual(parseEntries("a red apple\na blue bird x2\n\n a green hill ×2 \na calm lake *1\na tall tree X2"), [
    { source: "a red apple", copies: 1 },
    { source: "a blue bird", copies: 2 },
    { source: "a green hill", copies: 2 },
    { source: "a calm lake", copies: 1 },
    { source: "a tall tree", copies: 2 },
  ]);
  // 설명 안의 x·숫자는 장수 표시가 아니다(띄어 쓴 줄 끝 표시만)
  for (const line of ["a 4x4 truck on a road", "an xbox2 on a desk", "a box2", "two x marks on a map", "a road with route 2"]) assert.deepEqual(parseEntries(line), [{ source: line, copies: 1 }], line);
  // 1~2가 아닌 숫자
  for (const [line, n] of [["a red apple x3", 3], ["a red apple x0", 0], ["a red apple x24", 24], ["a red apple × 10", 10]]) {
    assert.deepEqual(parseEntries(line), [{ source: "a red apple", copies: 1, badCopies: n }]);
    const p = plan(`a calm lake at dawn\n${line}`);
    assert.deepEqual(p.items, [], "오류가 있으면 한 장도 맡기지 않는다");
    assert.deepEqual(p.errors.map((e) => e.line), [2]);
    assert.match(p.errors[0].message, /2장까지/);
  }
  // 장수 표시만 있고 설명이 없는 줄
  assert.deepEqual(plan("a calm lake at dawn\n x2").errors.map((e) => e.line), [2]);
});

test("혼합 입력의 합계 경계: 24장은 통과, 25장은 통째로 막는다", () => {
  assert.equal(BATCH_MAX, 24);
  // [줄 수, 그중 2장인 줄 수] → 합계
  for (const [n, twos] of [[24, 0], [12, 12], [20, 4], [23, 1], [13, 11], [1, 1]]) {
    const p = plan(mixed(n, twos));
    assert.equal(p.total, n + twos, `${n}줄 가운데 ${twos}줄이 2장`);
    assert.deepEqual(p.errors, []);
    assert.equal(p.items.length, n + twos);
    assert.equal(p.lines, n);
  }
  for (const [n, twos] of [[25, 0], [24, 1], [13, 12], [20, 5], [23, 2], [24, 24]]) {
    const p = plan(mixed(n, twos));
    assert.equal(p.total, n + twos);
    assert.ok(p.total > 24);
    assert.deepEqual(p.items, [], `${p.total}장은 한 장도 계획에 넣지 않는다`);
    assert.match(p.errors[0].message, new RegExp(`24장까지.*지금 ${p.total}장`));
    assert.equal(p.errors[0].line, 0);
  }
  // 2장인 줄 하나를 1장으로 바꾸면 25 → 24로 통과한다
  const over = mixed(24, 1);
  assert.equal(plan(over).items.length, 0);
  assert.equal(plan(setLineCopies(over, 0, 1)).items.length, 24);
});

test("계획 항목: 줄 번호·장 번호·제목이 줄마다 장수를 따르고, 같은 줄의 두 장은 시드가 다르다", () => {
  const p = plan("a red apple on a table\na blue bird on a branch x2\na green hill at dawn");
  assert.deepEqual(p.items.map((i) => [i.line, i.copy, i.title, i.source]), [
    [1, 1, "실사·블로그 1번", "a red apple on a table"],
    [2, 1, "실사·블로그 2번-1", "a blue bird on a branch"],
    [2, 2, "실사·블로그 2번-2", "a blue bird on a branch"],
    [3, 1, "실사·블로그 3번", "a green hill at dawn"],
  ]);
  assert.ok(!p.items.some((i) => /x2/.test(i.prompt)), "장수 표시는 그림 설명에 들어가지 않는다");
  assert.equal(p.items[1].prompt, p.items[2].prompt);
  assert.notEqual(p.items[1].seed, p.items[2].seed);
  assert.equal(new Set(p.items.map((i) => i.seed)).size, 4);
  assert.deepEqual(plan("a red apple on a table x2\na blue bird on a branch", { fixedSeed: 10 }).items.map((i) => i.seed), [10, 11, 12]);
});

test("예전의 묶음 전체 장수(copies)도 읽는다: 표시가 없는 줄의 기본 장수로 쓰고, 줄의 표시가 우선한다", () => {
  const text = "a red apple on a table\na blue bird on a branch x1\na green hill at dawn x2";
  assert.deepEqual(plan(text).items.map((i) => i.line), [1, 2, 3, 3], "기본은 1장");
  assert.deepEqual(plan(text, { copies: 1 }).items.map((i) => i.line), [1, 2, 3, 3]);
  assert.deepEqual(plan(text, { copies: 2 }).items.map((i) => i.line), [1, 1, 2, 3, 3], "기본 2장이어도 x1 줄은 1장");
  for (const copies of [0, 3, 1.5, "2", null, undefined, NaN]) assert.equal(plan(text, { copies }).items.length, 4, `이상한 기본 장수(${copies})는 1장으로`);
  assert.equal(plan(mixed(12, 0), { copies: 2 }).items.length, 24);
  assert.equal(plan(mixed(13, 0), { copies: 2 }).items.length, 0);
});

test("편집: 줄의 장수를 버튼으로 바꾸면 그 줄의 표시만 바뀌고, 줄을 끼우거나 지워도 장수가 줄을 따라간다", () => {
  let text = "a red apple on a table\n\na blue bird on a branch\n  a green hill at dawn  ";
  text = setLineCopies(text, 1, 2);
  assert.equal(text, "a red apple on a table\n\na blue bird on a branch x2\n  a green hill at dawn  ", "빈 줄은 세지 않고, 다른 줄은 글자 하나 바뀌지 않는다");
  assert.deepEqual(parseEntries(text).map((e) => e.copies), [1, 2, 1]);
  // 맨 앞에 줄을 끼워도 2장은 「blue bird」 줄에 남는다
  const inserted = `a new first line here\n${text}`;
  assert.deepEqual(parseEntries(inserted).map((e) => [e.source, e.copies]), [["a new first line here", 1], ["a red apple on a table", 1], ["a blue bird on a branch", 2], ["a green hill at dawn", 1]]);
  // 첫 줄을 지워도 마찬가지
  assert.deepEqual(parseEntries(text.split("\n").slice(1).join("\n")).map((e) => [e.source, e.copies]), [["a blue bird on a branch", 2], ["a green hill at dawn", 1]]);
  // 같은 값을 다시 눌러도 그대로, 1장으로 돌리면 표시를 뗀다, 표시가 여러 번 붙지 않는다
  assert.equal(setLineCopies(text, 1, 2), text);
  assert.equal(setLineCopies(setLineCopies(text, 1, 2), 1, 2).split("x2").length - 1, 1);
  assert.equal(setLineCopies(text, 1, 1), "a red apple on a table\n\na blue bird on a branch\n  a green hill at dawn  ");
  // 잘못 적은 표시(x3)가 있던 줄도 버튼으로 고친다
  assert.equal(setLineCopies("a red apple x3", 0, 2), "a red apple x2");
  assert.equal(setLineCopies("a red apple x3", 0, 1), "a red apple");
  // 없는 줄 번호·이상한 장수는 아무것도 바꾸지 않는다
  for (const [i, n] of [[9, 2], [-1, 2], [0, 3], [0, 0], [0, 1.5]]) assert.equal(setLineCopies(text, i, n), text);
  // 사람이 손으로 적은 표시와 버튼이 만든 표시는 같은 뜻이다
  assert.deepEqual(parseEntries(setLineCopies("a red apple", 0, 2)), parseEntries("a red apple ×2"));
  assert.deepEqual(parseLines(text).length, 3);
});

test("접수: 그림마다 접수 번호가 따로 — 혼합 24장이 엔진에 24개 작업으로, 한 줄의 두 장도 서로 다른 번호", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage();
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  await c.pair(engine.st.codes[0]);
  const p = plan(mixed(20, 4));
  assert.equal(p.items.length, 24);
  saveDraft(storage, A, p.items);
  assert.deepEqual(await submitRemaining(c, storage), { sent: 24, skipped: 0, remaining: 0 });
  const sent = engine.st.calls.filter(isPost).map((x) => x.body);
  assert.equal(sent.length, 24);
  assert.equal(new Set(sent.map((b) => b.clientRequestId)).size, 24, "접수 번호 24개가 모두 다르다");
  assert.equal(new Set(sent.map((b) => b.track.id)).size, 24);
  assert.equal(engine.st.jobs.length, 24);
  const twin = sent.filter((b) => b.title.startsWith("실사·블로그 1번-"));
  assert.deepEqual(twin.map((b) => b.title), ["실사·블로그 1번-1", "실사·블로그 1번-2"]);
  assert.equal(twin[0].task.prompt, twin[1].task.prompt);
  assert.notEqual(twin[0].task.seed, twin[1].task.seed);
  assert.notEqual(twin[0].clientRequestId, twin[1].clientRequestId);
  assert.ok(sent.every((b) => !/ x2$/.test(b.task.prompt)));
});

test("복원: 혼합 묶음을 맡기다 화면이 닫혀도, 다시 열면 남은 장만 — 한 줄의 둘째 장만 남은 경우도 그 장만 맡긴다", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage();
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  await c.pair(engine.st.codes[0]);
  const p = plan("a red apple on a table x2\na blue bird on a branch\na green hill at dawn x2");
  assert.equal(p.items.length, 5);
  saveDraft(storage, A, p.items);
  let n = 0;
  await submitRemaining(c, storage, { shouldStop: () => n++ >= 1 }); // 첫 줄의 첫 장만 맡기고 닫힘
  c.dispose();
  const c2 = createEngineClient({ memberId: A, storage, fetch: engine.fetch });
  const left = remainingItems(c2, storage);
  assert.deepEqual(left.map((i) => [i.line, i.copy]), [[1, 2], [2, 1], [3, 1], [3, 2]], "첫 줄은 둘째 장만 남았다");
  assert.deepEqual(await submitRemaining(c2, storage), { sent: 4, skipped: 1, remaining: 0 });
  const sent = engine.st.calls.filter(isPost).map((x) => x.body);
  assert.deepEqual(sent.map((b) => b.title), ["실사·블로그 1번-1", "실사·블로그 1번-2", "실사·블로그 2번", "실사·블로그 3번-1", "실사·블로그 3번-2"]);
  assert.equal(new Set(sent.map((b) => b.clientRequestId)).size, 5);
  assert.equal(engine.st.jobs.length, 5, "이미 맡긴 장을 다시 보내지 않았다");
});

test("적던 내용 복원: 줄과 줄마다 장수·용도·비율이 회원별로 돌아오고, 예전 형식(묶음 전체 장수)은 줄마다 장수로 옮긴다", () => {
  const storage = memoryStorage();
  const text = "a red apple on a table\na blue bird on a branch x2\n\na green hill at dawn";
  saveCompose(storage, A, { text, presetId: "thumbnail", sizeId: "tall" });
  assert.deepEqual(loadCompose(storage, A), { text, presetId: "thumbnail", sizeId: "tall" });
  assert.deepEqual(parseEntries(loadCompose(storage, A).text).map((e) => e.copies), [1, 2, 1]);
  assert.equal(loadCompose(storage, B), null, "다른 회원에게는 보이지 않는다");
  // 비우면 보관한 것도 지운다(맡기고 난 뒤 빈 칸)
  saveCompose(storage, A, { text: "  \n ", presetId: "photo", sizeId: "wide" });
  assert.equal(storage.map.has(`fis.compose.v1:${A}`), false);
  assert.equal(loadCompose(storage, A), null);
  // 예전 형식: copies를 따로 두던 값
  const set = (v) => storage.map.set(`fis.compose.v1:${A}`, JSON.stringify(v));
  set({ v: 1, text: "a red apple on a table\na blue bird on a branch\n\na green hill at dawn x1", presetId: "photo", sizeId: "wide", copies: 2 });
  const migrated = loadCompose(storage, A);
  assert.equal(migrated.text, "a red apple on a table x2\na blue bird on a branch x2\n\na green hill at dawn x1", "표시가 없던 줄은 2장으로, 이미 표시가 있던 줄은 그대로");
  assert.equal(plan(migrated.text).total, 5);
  assert.equal(plan("a red apple on a table\na blue bird on a branch\n\na green hill at dawn x1", { copies: 2 }).total, 5, "예전 방식으로 센 장수와 같다");
  set({ v: 1, text: "a red apple on a table", presetId: "photo", sizeId: "wide", copies: 1 });
  assert.equal(loadCompose(storage, A).text, "a red apple on a table");
  set({ text: "a red apple on a table", copies: 7 });
  assert.deepEqual(loadCompose(storage, A), { text: "a red apple on a table", presetId: "", sizeId: "" }, "이상한 장수는 무시(1장)");
  // 손상된 값
  for (const bad of ["{broken", "null", "[]", JSON.stringify({ text: 5 }), JSON.stringify({ text: "x".repeat(40_001) })]) {
    storage.map.set(`fis.compose.v1:${A}`, bad);
    assert.equal(loadCompose(storage, A), null, bad.slice(0, 20));
  }
  // 보관에 실패해도 예외를 내지 않는다(편의 기능)
  storage.failSet = () => true;
  assert.doesNotThrow(() => saveCompose(storage, A, { text: "a red apple", presetId: "photo", sizeId: "wide" }));
});

test("만들기 화면: 줄마다 장수 버튼이 글의 표시를 고치고, 적던 내용은 그 회원일 때만 보관한다", async () => {
  const s = await readFile(new URL("../src/components/studio/CreateScreen.tsx", import.meta.url), "utf8");
  assert.match(s, /const entries = useMemo\(\(\) => parseEntries\(text\), \[text\]\);/);
  assert.match(s, /onClick=\{\(\) => setText\(\(t\) => setLineCopies\(t, i, n\)\)\}/);
  assert.match(s, /aria-label=\{`\$\{i \+ 1\}번째 줄 장수`\}/);
  assert.match(s, /buildPlan\(\{ text, preset, width: size\.width, height: size\.height, variantId, fixedSeed \}\)/, "묶음 전체 장수를 따로 두지 않는다(기본 1장)");
  assert.ok(!/\bsetCopies\b|useState\(1\)/.test(s), "묶음 전체 장수 상태가 남아 있지 않다");
  assert.match(s, /지금 \{plan\.total\}장 · \{BATCH_MAX\}장까지/);
  // 회원이 바뀌면 그 회원 것으로 통째로 바꾸고, 되돌린 회원과 같을 때만 보관
  assert.match(s, /setText\(c\?\.text \?\? ""\);/);
  assert.match(s, /setRestoredFor\(memberId\);/);
  assert.match(s, /if \(restoredFor === memberId\) saveCompose\(window\.localStorage, memberId, \{ text, presetId, sizeId \}\);/);
});
