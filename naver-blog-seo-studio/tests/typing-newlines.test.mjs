// 2026-11-02: 블록 사이 문단 나눔("\n\n")이 입력 직전 글 정리에서 지워지지 않는지 검사 (브라우저·네트워크 없음)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../extension/sidepanel.js", import.meta.url), "utf8");
const pick = (from, to) => { const start = source.indexOf(from), end = source.indexOf(to, start); assert.ok(start >= 0 && end > start, from); return source.slice(start, end); };
const context = { randomDelay: () => 2 };
vm.createContext(context);
vm.runInContext(pick("const plainText", "function formatBrowserError") + pick("function typingChunks", "async function typeWithDebugger") + "this.plainText = plainText; this.typingText = typingText; this.typingChunks = typingChunks;", context);

test("두 번째 블록 앞의 빈 줄이 남아 Enter 두 번이 보내진다", () => {
  const chunks = context.typingChunks(context.typingText("\n\n가을 캠핑에 필요한 기본 장비는?"));
  assert.equal(chunks.slice(0, 2).join("|"), "\n|\n");
  assert.equal(chunks.slice(2).join(""), "가을 캠핑에 필요한 기본 장비는?");
});

test("앞뒤 줄바꿈 외의 글 정리(마크다운·공백)는 그대로 한다", () => {
  assert.equal(context.typingText("  **굵게** 문장  "), "굵게 문장");
  assert.equal(context.typingText("\n\n## 소제목\n"), "\n\n소제목\n");
  assert.equal(context.typingText("제목"), "제목");
});

test("확인용 plainText는 예전처럼 앞뒤를 잘라 낸다", () => {
  assert.equal(context.plainText("\n\n문장"), "문장");
});
