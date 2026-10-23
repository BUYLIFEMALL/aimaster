import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown } from "../src/lib/markdown/parser.ts";

test("알파벳 목록: a.로 시작하는 연속 줄은 <ol type=a>", () => {
  const html = parseMarkdown("a. 첫째\nb. 둘째 **굵게**\nc. 셋째");
  assert.match(html, /<ol type="a"><li>첫째<\/li><li>둘째 <strong>굵게<\/strong><\/li><li>셋째<\/li><\/ol>/);
});

test("알파벳 목록: 앞 문단과 빈 줄 없이 이어져도, 뒤 문단은 분리", () => {
  const html = parseMarkdown("소개\n\na. 하나\nb. 둘\n\n본문");
  assert.match(html, /<p>소개<\/p>\s*<ol type="a">/);
  assert.match(html, /<\/ol>\s*<p>본문<\/p>/);
});

test("알파벳 목록: a가 아닌 글자로 시작하거나 문장 중간의 a.는 일반 문단", () => {
  assert.doesNotMatch(parseMarkdown("b. 다음"), /<ol/);
  assert.doesNotMatch(parseMarkdown("문장 중간 a. 입니다"), /<ol/);
  assert.doesNotMatch(parseMarkdown("a.없음"), /<ol/);
});

test("숫자 목록·체크리스트·표 정렬은 기존대로", () => {
  assert.match(parseMarkdown("1. 가\n2. 나"), /<ol>/);
  assert.match(parseMarkdown("- [x] 완료\n- [ ] 미완료"), /task-marker/);
  const t = parseMarkdown("| a | b |\n| :--- | ---: |\n| 1 | 2 |");
  assert.match(t, /align="left"/);
  assert.match(t, /align="right"/);
});
