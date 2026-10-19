// 답변 마크다운 표시(L7) — 실제 HTML로 그려서 확인
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/components/chat/Markdown.tsx";

const html = (text) => renderToStaticMarkup(createElement(Markdown, { text }));

test("굵게·목록이 기호가 아니라 서식으로 표시된다", () => {
  const h = html("- **국내 출장 일비**: 하루 **4만 5천 원**\n- 두 번째");
  assert.match(h, /<ul[^>]*>/);
  assert.match(h, /<strong[^>]*>국내 출장 일비<\/strong>/);
  assert.doesNotMatch(h, /\*\*/);
});

test("물결표 하나(범위 표기)는 취소선이 되지 않는다, 두 개는 취소선", () => {
  const h = html("2026~2030년 투자액은 7조 달러, 매출은 3조~4조 달러");
  assert.doesNotMatch(h, /<del>/);
  assert.match(h, /2026~2030년/);
  assert.match(html("~~삭제~~"), /<del>삭제<\/del>/);
});

test("원본 HTML은 그리지 않고, 링크는 새 창으로", () => {
  const h = html('<script>alert(1)</script>\n\n[출처](https://ex.com)');
  assert.doesNotMatch(h, /<script>/);
  assert.match(h, /<a href="https:\/\/ex\.com" target="_blank" rel="noreferrer"/);
});
