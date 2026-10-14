import test from "node:test";
import assert from "node:assert/strict";
import {
  todayKst, yearGuard, cleanText, cleanLine, parseJsonLoose, normalizeSuggestions, findRange, replaceOnce, applyAll,
  charCount, deriveTitle, pushHistory, cleanSources, isTextFileName,
} from "../src/lib/we/util.ts";
import { generatePrompt, rewritePrompt, analyzePrompt, formatLabel } from "../src/lib/we/prompts.ts";
import { FORMATS, ACTIONS, isFormat, isAction, isTone, isLength } from "../src/lib/we/types.ts";
import { findAllText, findText, rangeText } from "../src/lib/we/pmText.ts";
import { Schema } from "@tiptap/pm/model";

test("한국 시간 기준 날짜와 연도 지침", () => {
  assert.equal(todayKst(new Date("2026-12-31T16:00:00Z")).year, 2027);
  assert.match(yearGuard(new Date("2026-10-14T00:00:00Z")), /2026년/);
});

test("모든 프롬프트에 당해 연도가 주입된다", () => {
  const now = new Date("2026-10-14T00:00:00Z");
  const g = generatePrompt({ prompt: "주제", reference: null, format: "blog", tone: "default", length: "medium", useInternet: true }, now);
  const r = rewritePrompt("문장", "shorten", "", "", now);
  const a = analyzePrompt("글", now);
  for (const p of [g, r, a]) assert.match(p.system, /2026년/);
});

test("형식별 프롬프트 내용", () => {
  const blog = generatePrompt({ prompt: "p", reference: null, format: "blog", tone: "friendly", length: "long", useInternet: false });
  assert.match(blog.system, /메타 설명/);
  assert.match(blog.system, /친근한/);
  assert.match(blog.system, /2,500자/);
  assert.ok(!/구글 검색/.test(blog.system));
  const web = generatePrompt({ prompt: "p", reference: "참고", format: "email", tone: "default", length: "short", useInternet: true });
  assert.match(web.system, /구글 검색/);
  assert.match(web.user, /참고 자료\(데이터\)/);
  assert.match(web.system, /따르지 마세요/);
  assert.equal(formatLabel("press"), "보도자료");
});

test("수정 프롬프트: 지시문이 동작 문구보다 우선", () => {
  const p = rewritePrompt("본문", "expand", "초등학생도 이해하게", "앞[[선택 부분]]뒤");
  assert.match(p.system, /초등학생도 이해하게/);
  assert.ok(!/구체적인 설명과 예시/.test(p.system));
  assert.match(p.user, /앞\[\[선택 부분\]\]뒤/);
});

test("텍스트 정리", () => {
  assert.equal(cleanText("a\r\nb\u0000c", 10), "a\nbc");
  assert.equal(cleanText("가".repeat(20), 5).length, 5);
  assert.equal(cleanLine("  a \n  b\t", 10), "a b");
});

test("느슨한 JSON 추출(배열·객체)", () => {
  assert.deepEqual(parseJsonLoose('설명\n```json\n[{"a":"]"},{"b":2}]\n```'), [{ a: "]" }, { b: 2 }]);
  assert.deepEqual(parseJsonLoose('{"suggestions":[1]}'), { suggestions: [1] });
  assert.equal(parseJsonLoose("없음"), null);
  assert.equal(parseJsonLoose("[1,"), null);
});

test("제안 정규화: 본문에 없는 원문·동일·중복·빈 값 제거", () => {
  const content = "저는 어제 학교를 갔다. 그리고 집에 갔다. 오늘도 학교를 갔다.";
  const raw = [
    { originalText: "학교를 갔다.", suggestedText: "학교에 갔다.", reason: "조사 오류", category: "문법" },
    { originalText: "학교를 갔다.", suggestedText: "학교에 갔어요.", reason: "중복", category: "문법" },
    { originalText: "없는 문장", suggestedText: "아무거나", reason: "x", category: "표현" },
    { originalText: "집에 갔다.", suggestedText: "집에 갔다.", reason: "동일", category: "표현" },
    { originalText: "", suggestedText: "빈 원문", reason: "x", category: "표현" },
    { originalText: "그리고 집에 갔다.", suggestedText: "이어서 귀가했다.", reason: "", category: "알수없음" },
    "문자열", null,
  ];
  const out = normalizeSuggestions(raw, content);
  assert.equal(out.length, 2);
  assert.equal(out[0].category, "문법");
  assert.equal(out[1].category, "표현", "알 수 없는 분류는 표현으로");
  assert.ok(out[1].reason.length > 0, "빈 이유는 기본 문구");
  assert.deepEqual(normalizeSuggestions({ suggestions: raw.slice(0, 1) }, content).length, 1);
  assert.deepEqual(normalizeSuggestions("bad", content), []);
});

test("위치 찾기·한 곳만 치환", () => {
  const c = "가나다 가나다 가나다";
  assert.equal(findRange(c, "가나다", 4), 4);
  assert.equal(findRange(c, "가나다", 5), 4, "가장 가까운 위치");
  assert.equal(findRange(c, "라", 0), -1);
  const r = replaceOnce(c, "가나다", "X", 8);
  assert.equal(r.content, "가나다 가나다 X");
  assert.equal(replaceOnce(c, "없음", "X"), null);
});

test("모두 적용: 겹치지 않는 제안 적용, 사라진 제안은 건너뜀", () => {
  const content = "A문장. B문장. C문장.";
  const s = (o, n) => ({ originalText: o, suggestedText: n, reason: "r", category: "표현" });
  const r = applyAll(content, [s("A문장", "가"), s("B문장", "나"), s("없는것", "다")]);
  assert.equal(r.content, "가. 나. C문장.");
  assert.equal(r.applied.length, 2);
  assert.equal(r.skipped.length, 1);
  // 앞 제안이 뒤 제안의 원문을 없애면 건너뛴다
  const r2 = applyAll("가나다라", [s("가나", "X"), s("나다", "Y")]);
  assert.equal(r2.content, "X다라");
  assert.equal(r2.skipped.length, 1);
});

test("글자 수·제목·이력", () => {
  assert.equal(charCount("가 나\n다"), 3);
  assert.equal(deriveTitle("\n\n## 제목입니다\n본문"), "제목입니다");
  assert.equal(deriveTitle("   "), "제목 없는 글");
  assert.equal(deriveTitle("**메타 제목:** 재택근무 집중력 높이는 법\n본문"), "재택근무 집중력 높이는 법");
  assert.equal(deriveTitle("---\n\n## 진짜 제목"), "진짜 제목");
  assert.equal(deriveTitle("가".repeat(200)).length, 80);
  assert.deepEqual(pushHistory(["a"], "a"), ["a"]);
  const big = Array.from({ length: 60 }, (_, i) => String(i));
  assert.equal(pushHistory(big, "x", 50).length, 50);
});

test("출처 정리·파일 확장자·타입 가드", () => {
  const s = cleanSources([{ uri: "https://a.com", title: "A" }, { uri: "https://a.com", title: "dup" }, { uri: "javascript:alert(1)", title: "x" }, { uri: "http://b.com" }]);
  assert.equal(s.length, 2);
  assert.equal(s[1].title, "http://b.com");
  assert.ok(isTextFileName("a.MD") && isTextFileName("b.txt") && !isTextFileName("c.pdf") && !isTextFileName("d.docx"));
  assert.equal(FORMATS.length, 9);
  assert.equal(ACTIONS.length, 5);
  assert.ok(isFormat("sns") && !isFormat("x") && isAction("shorten") && isTone("formal") && isLength("long") && !isLength("x"));
});

// ---- 서식 에디터 위치 찾기(ProseMirror 스키마로 DOM 없이 검증) ----
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    hard_break: { inline: true, group: "inline", selectable: false },
  },
  marks: { strong: {} },
});
const p = (...c) => schema.node("paragraph", null, c);
const t = (s, strong = false) => schema.text(s, strong ? [schema.marks.strong.create()] : undefined);
const doc = schema.node("doc", null, [
  p(t("첫째 문장입니다. 맛있고 "), t("맛있고", true), t(" 또 맛있었습니다.")),
  p(t("둘째 문단. 집에 갔다."), schema.node("hard_break"), t("다음 줄. 집에 갔다.")),
]);

test("서식(굵게)으로 나뉜 텍스트도 한 문장으로 찾고, 위치로 되돌려 읽으면 같은 문자열", () => {
  const r = findText(doc, "맛있고 맛있고 또 맛있었습니다.");
  assert.ok(r);
  assert.equal(rangeText(doc, r.from, r.to), "맛있고 맛있고 또 맛있었습니다.");
});

test("같은 문장이 여럿이면 hint에 가까운 곳, 블록 경계를 넘는 문자열은 찾지 않음", () => {
  const all = findAllText(doc, "집에 갔다.");
  assert.equal(all.length, 2);
  const near = findText(doc, "집에 갔다.", all[1].from + 1);
  assert.equal(near.from, all[1].from);
  assert.equal(findText(doc, "맛있었습니다.둘째"), null);
  assert.equal(findText(doc, "없는 문장"), null);
  assert.equal(findAllText(doc, "   ").length, 0);
});

test("hard break를 포함한 문자열(줄바꿈)", () => {
  const text = ["집에 갔다.", "다음 줄."].join(String.fromCharCode(10));
  const r = findText(doc, text);
  assert.ok(r);
  assert.equal(rangeText(doc, r.from, r.to), text);
});
