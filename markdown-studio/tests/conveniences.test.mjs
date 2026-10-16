// 2026-10-17 v1.12 편의 기능(예상 읽기 시간·템플릿 미니어처) 단위 테스트
import test from "node:test";
import assert from "node:assert/strict";
import { readingMinutes, readingLabel } from "../src/lib/documents/readingTime.ts";
import { templatePreviewLines } from "../src/lib/documents/templatePreview.ts";

test("예상 읽기 시간: 공백 제외 500자/분, 1분 미만은 1분", () => {
  assert.equal(readingMinutes(""), 0);
  assert.equal(readingMinutes("   \n "), 0);
  assert.equal(readingMinutes("가"), 1);
  assert.equal(readingMinutes("가".repeat(500)), 1);
  assert.equal(readingMinutes("가".repeat(501)), 2);
  assert.equal(readingMinutes("가 ".repeat(1000)), 2);
  assert.equal(readingLabel(""), "읽기 0분");
  assert.equal(readingLabel("가".repeat(1420)), "약 3분 소요");
});

test("템플릿 미니어처: 줄 종류 구분·코드 안쪽 생략·표 구분선 생략·최대 줄 수", () => {
  const md = "# 회의록\n\n## 안건\n- 첫째\n1. 둘째\n- [ ] 할 일\n| 이름 | 역할 |\n|---|---|\n> 메모\n```js\nconst a = 1;\n```\n본문";
  const lines = templatePreviewLines(md, 20);
  assert.deepEqual(lines.map(l => l.kind), ["h", "h", "list", "list", "check", "table", "quote", "code", "text"]);
  assert.equal(lines[0].level, 1);
  assert.equal(lines[1].level, 2);
  assert.equal(lines[5].text, "이름 · 역할");
  assert.equal(lines[7].text, "js");
  assert.equal(templatePreviewLines(md).length, 6);
  assert.deepEqual(templatePreviewLines(""), []);
  // 빈 항목·빈 표 칸·빈 체크도 모양이 보이게
  const blank = templatePreviewLines("-\n1.\n- [ ]\n| | |");
  assert.deepEqual(blank.map(l => [l.kind, l.text]), [["list", "항목"], ["list", "항목"], ["check", "할 일"], ["table", "· · ·"]]);
});
