// 병합 B-5·B-7: 서식 포함 복사·TXT/MD/HTML 내보내기 — 소제목 판별·목록·이스케이프·파일 이름. 네트워크·AI 없음.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isHeadingLine, toBlocks, toHtmlFragment, toHtmlDocument, toMarkdown, toPlainText, exportFileName } from "../lib/draftExport.ts";

const body = `가을 캠핑은 일교차가 커서 준비가 중요합니다. 오늘은 꼭 챙길 것을 정리합니다.

가을 캠핑 준비물 체크리스트

침낭은 영하 5도 기준으로 고르는 것이 좋습니다.
밤에는 기온이 많이 내려갑니다.

• 침낭
• 방수포
• 여분 양말

어떤 텐트를 고르면 좋을까요?

Q. 타프가 꼭 필요한가요?
A. 비 소식이 있으면 챙기는 것이 좋습니다.`;

test("heading detection: short non-sentence lines and short questions; sentences and long lines are not", () => {
  assert.equal(isHeadingLine("가을 캠핑 준비물 체크리스트"), true);
  assert.equal(isHeadingLine("어떤 텐트를 고르면 좋을까요?"), true);
  assert.equal(isHeadingLine("침낭은 영하 5도 기준으로 고르는 것이 좋습니다."), false);
  assert.equal(isHeadingLine("오늘은 정리해 볼게요"), false);
  assert.equal(isHeadingLine("가을 캠핑 준비에서 가장 중요한 것은 무엇일까요"), true);
  assert.equal(isHeadingLine("캠핑장 선택은 어떻게 하면 좋을까요"), true);
  assert.equal(isHeadingLine("이미지가 오면 안 됩니다."), false);
  assert.equal(isHeadingLine("가".repeat(61)), false);
  assert.equal(isHeadingLine("Q. 타프가 꼭 필요한가요?"), false);
});

test("blocks: paragraph, heading, multi-line paragraph, list, question heading, FAQ paragraph", () => {
  const b = toBlocks(body);
  assert.deepEqual(b.map((x) => x.type), ["paragraph", "heading", "paragraph", "list", "heading", "paragraph"]);
  assert.deepEqual(b[3].items, ["침낭", "방수포", "여분 양말"]);
});

test("html escapes and structures; markdown and plain text keep the content", () => {
  const html = toHtmlFragment("<b>제목</b>", "첫 문단 <script>alert(1)</script>입니다.\n\n소제목 하나");
  assert.match(html, /^<h2>&lt;b&gt;제목&lt;\/b&gt;<\/h2>/); assert.doesNotMatch(html, /<script>/); assert.match(html, /<h3>소제목 하나<\/h3>/);
  assert.match(toHtmlFragment("t", body), /<ul><li>침낭<\/li><li>방수포<\/li><li>여분 양말<\/li><\/ul>/);
  assert.match(toHtmlFragment("t", body), /좋습니다\.<br>밤에는/);
  const doc = toHtmlDocument("제목", body);
  assert.match(doc, /^<!doctype html>/); assert.match(doc, /charset="utf-8"/);
  const md = toMarkdown("제목", body);
  assert.match(md, /^# 제목\n/); assert.match(md, /\n## 가을 캠핑 준비물 체크리스트\n/); assert.match(md, /\n- 침낭\n- 방수포/);
  assert.equal(toPlainText(" 제목 ", "본문\r\n둘째 줄"), "제목\n\n본문\n둘째 줄\n");
});

test("file names drop forbidden characters and fall back when empty", () => {
  assert.equal(exportFileName('가을: 캠핑/준비 "꿀팁"?', "md"), "가을 캠핑준비 꿀팁.md");
  assert.equal(exportFileName("  ", "txt"), "블로그 원고.txt");
  assert.equal(exportFileName("가".repeat(80), "html").length, 65);
});
