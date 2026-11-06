import test from "node:test";
import assert from "node:assert/strict";
import { MAX_TRANSLATE_ITEMS, parseTranslation, readTranslateItems, translatePrompt } from "../lib/edit/translate.ts";

test("번역 입력: 글이 있는 장면만, 최대 20개, 길이 자르기", () => {
  const raw = [
    { id: "a", caption: "  첫  장면 ", narration: "" },
    { id: "b", caption: "", narration: "" },
    { id: "c", caption: "x".repeat(300), narration: "y".repeat(1200) },
    null,
    { id: 5, caption: "번호가 글자가 아님" },
  ];
  const items = readTranslateItems(raw);
  assert.deepEqual(items.map((i) => i.id), ["a", "c"]);
  assert.equal(items[0].caption, "첫 장면");
  assert.equal(items[1].caption.length, 200);
  assert.equal(items[1].narration.length, 1000);
  assert.equal(readTranslateItems(Array.from({ length: 30 }, (_, i) => ({ id: String(i), caption: "c" }))).length, MAX_TRANSLATE_ITEMS);
  assert.deepEqual(readTranslateItems("bad"), []);
});

test("번역 프롬프트: 대상 언어 이름과 장면 JSON", () => {
  const { system, prompt } = translatePrompt("ja", [{ id: "a", caption: "안녕", narration: "" }]);
  assert.match(system, /Japanese/);
  assert.deepEqual(JSON.parse(prompt), { items: [{ id: "a", caption: "안녕", narration: "" }] });
});

test("번역 응답: 번호대로 맞추고, 빠진 장면은 원문, 빈 칸은 빈 채로, 하나도 없으면 null", () => {
  const items = [{ id: "a", caption: "안녕", narration: "반갑습니다" }, { id: "b", caption: "둘", narration: "" }];
  const out = parseTranslation({ items: [{ id: "b", caption: "Two", narration: "should be ignored" }, { id: "a", caption: "Hello", narration: "Nice to meet you" }] }, items);
  assert.deepEqual(out, [{ id: "a", caption: "Hello", narration: "Nice to meet you" }, { id: "b", caption: "Two", narration: "" }]);
  assert.deepEqual(parseTranslation({ items: [{ id: "zzz", caption: "x" }] }, items), null);
  assert.deepEqual(parseTranslation(null, items), null);
});
