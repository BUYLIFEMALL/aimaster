import test from "node:test";
import assert from "node:assert/strict";
import { MAX_LINES, isRewriteLevel, parseRewrite, readLines, rewritePrompt } from "../src/lib/rewrite.ts";

test("각색 강도: 줄 읽기 — 빈 줄 제거·공백 정리·줄 수 상한", () => {
  assert.deepEqual(readLines("첫  줄\n\n  둘째 줄 \r\n셋째"), ["첫 줄", "둘째 줄", "셋째"]);
  assert.deepEqual(readLines(["a", 3, "b"]), ["a", "b"]);
  assert.equal(readLines(Array.from({ length: 30 }, (_, i) => `줄${i}`)).length, MAX_LINES);
  assert.equal(readLines("x".repeat(400))[0].length, 300);
});

test("각색 강도: 강도 이름 검사와 프롬프트", () => {
  assert.equal(isRewriteLevel("strong"), true);
  assert.equal(isRewriteLevel("max"), false);
  const { system, prompt } = rewritePrompt("light", ["안녕 하세요", "둘째"], "주제");
  assert.match(system, /맞춤법만/);
  assert.match(system, /2줄/);
  assert.match(prompt, /주제: 주제\n대본:\n1\. 안녕 하세요\n2\. 둘째/);
});

test("각색 강도: 응답은 줄 수가 같아야 하고 번호는 뗀다, 다르면 null", () => {
  assert.deepEqual(parseRewrite({ lines: ["1. 안녕하세요", "2) 둘째"] }, 2), ["안녕하세요", "둘째"]);
  assert.deepEqual(parseRewrite({ items: [{ text: "가" }, { text: "나" }] }, 2), ["가", "나"]);
  assert.equal(parseRewrite({ lines: ["하나"] }, 2), null);
  assert.equal(parseRewrite({ lines: ["하나", ""] }, 2), null);
  assert.equal(parseRewrite("bad", 2), null);
});
