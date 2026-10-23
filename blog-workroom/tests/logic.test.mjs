// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import test from "node:test";
import assert from "node:assert/strict";
import { parseBlogId, parsePostRef, decodeEntities } from "../src/lib/blogParse.ts";
import { keywordGrade, surge, quoteInText, copiesSource, joinSections, splitParagraphs, charCount, asReplacement } from "../src/lib/logic.ts";
import { nowRule, sectionPrompt, reviewPrompt, imagePrompt } from "../src/lib/prompts.ts";
import { isTextModel, isImageModel, TEXT_MODELS, DEFAULT_MODEL } from "../src/lib/models.ts";

test("블로그 주소·ID 해석", () => {
  assert.equal(parseBlogId("myblog_01"), "myblog_01");
  assert.equal(parseBlogId("https://blog.naver.com/myblog_01"), "myblog_01");
  assert.equal(parseBlogId("blog.naver.com/myblog_01/224442782663"), "myblog_01");
  assert.equal(parseBlogId("https://m.blog.naver.com/myblog_01"), "myblog_01");
  assert.equal(parseBlogId("https://blog.naver.com/PostList.naver?blogId=abc_def"), "abc_def");
  assert.equal(parseBlogId("https://blog.naver.com/PostView.naver"), null);
  assert.equal(parseBlogId("https://example.com/myblog"), null);
  assert.equal(parseBlogId("한글 아이디"), null);
});

test("블로그 글 주소 해석", () => {
  assert.deepEqual(parsePostRef("https://blog.naver.com/blogpeople/224442782663?fromRss=true"), { blogId: "blogpeople", logNo: "224442782663" });
  assert.deepEqual(parsePostRef("https://m.blog.naver.com/PostView.naver?blogId=abc&logNo=1234567"), { blogId: "abc", logNo: "1234567" });
  assert.equal(parsePostRef("https://blog.naver.com/blogpeople"), null);
  assert.equal(parsePostRef("https://news.naver.com/a/1234567"), null);
  assert.equal(decodeEntities("A&amp;B &lt;b&gt; &#39;x&#39; &#xAC00;"), "A&B <b> 'x' 가");
});

test("키워드 등급: 문서수 ÷ 월간 검색량(실측 분포 기준)", () => {
  assert.equal(keywordGrade(40000, 95000).grade, "골드");
  assert.equal(keywordGrade(800, 4000).grade, "실버", "검색량 1,000 미만은 골드가 아님");
  assert.equal(keywordGrade(5000, 100000).grade, "실버");
  assert.equal(keywordGrade(5000, 500000).grade, "일반");
  assert.equal(keywordGrade(5000, 900000).grade, "경쟁");
  assert.equal(keywordGrade(50, 10).grade, "검색 적음");
  assert.equal(keywordGrade(5000, null).ratio, null);
});

test("급상승 판정: 최근 3일 평균 ≥ 직전 7일 평균 × 1.5, 3일 중 2일·마지막 날이 기준 초과", () => {
  const base = [10, 10, 10, 10, 10, 10, 10];
  assert.equal(surge([...base, 20, 20, 20]).surging, true);
  assert.equal(surge([...base, 12, 12, 12]).surging, false, "50% 미만");
  assert.equal(surge([...base, 40, 9, 9]).surging, false, "하루만 튀고 마지막 날이 기준 이하");
  assert.equal(surge([0, 0, 0, 0, ...base, 30, 25, 20]).surging, true, "14일 중 마지막 10일로 판정");
  assert.equal(surge([1, 2, 3]).change, null);
});

test("검수 인용 확인·원문 유사 판정", () => {
  const text = "이유식은 보통 생후 4~6개월 사이에 시작합니다.\n쌀미음부터 시작하면 좋아요.";
  assert.equal(quoteInText("생후 4~6개월 사이에 시작합니다", text), true);
  assert.equal(quoteInText("“쌀미음부터  시작하면”", text), true, "따옴표·공백 무시");
  assert.equal(quoteInText("생후 8개월", text), false);
  assert.equal(quoteInText("이유", text), false, "너무 짧은 인용은 인정하지 않음");
  const src = ["아기가 목을 가누고 음식에 관심을 보일 때 이유식을 시작하는 것이 좋습니다라고 전문가들은 말합니다"];
  assert.equal(copiesSource("아기가 목을 가누고 음식에 관심을 보일 때 이유식을 시작하는 것이 좋습니다", src), true);
  assert.equal(copiesSource("목을 가눌 수 있고 음식에 흥미를 보이면 시작 시기로 볼 수 있어요", src), false);
});

test("초안 합치기·문단 나누기·글자 수", () => {
  const t = joinSections("제목", [{ heading: "", body: "도입 문단" }, { heading: "준비물", body: "냄비와 체" }]);
  assert.equal(t, "제목\n\n도입 문단\n\n■ 준비물\n냄비와 체");
  const p = splitParagraphs("첫 문단은 충분히 길게 써서 사십 자를 넘기도록 합니다. 정말로 길게 씁니다.\n\n짧음\n\n■ 소제목\n두 번째 문단도 충분히 길게 써서 사십 자를 넘기도록 합니다. 길게 씁니다.");
  assert.equal(p.length, 2, "짧은 문단은 앞 문단에 붙음");
  assert.equal(charCount("가 나\n다"), 3);
});

test("지시문에 당해 연도·월이 들어가고 회원 입력이 섞인다", () => {
  const now = new Date("2026-10-15T03:00:00Z");
  assert.match(nowRule(now), /2026년 10월/);
  const r = { blogItemId: null, keyword: "이유식", query: "이유식 시작 시기", related: [], sources: [], news: [], points: [{ text: "생후 4~6개월에 시작", source: 1, quote: "4~6개월", kept: true }, { text: "뺀 항목", source: 1, quote: "x", kept: false }], angle: "초보 부모 눈높이", gaps: [], approved: true, approvedAt: null, step: "approved" };
  const sp = sectionPrompt(r, null, { type: "정보형", length: "보통(2500자 내외)", experience: "쓰지 않음", request: "" }, "제목", [{ heading: "", goal: "도입", body: "" }, { heading: "시기", goal: "시기 설명", body: "" }], 1);
  assert.match(sp, /▶ 2\. 시기/);
  assert.match(sp, /생후 4~6개월에 시작/);
  assert.doesNotMatch(sp, /뺀 항목/, "체크 해제한 사전 지식은 넣지 않음");
  assert.match(reviewPrompt("제목", "본문", null, ["근거"]), /필수/);
  assert.match(imagePrompt({ title: "t", paragraph: "p", content: "c", style: "일러스트", request: "", common: "", hasRefs: false }), /한국인/);
});

test("모델 목록 검증", () => {
  assert.equal(isTextModel("openai", DEFAULT_MODEL.openai), true);
  assert.equal(isTextModel("gemini", DEFAULT_MODEL.gemini), true);
  assert.equal(isTextModel("openai", "gemini-3.5-flash"), false, "공급사와 모델이 맞아야 함");
  assert.equal(isImageModel("gemini-nano-banana-2.1"), true);
  assert.ok(TEXT_MODELS.every((m) => m.provider === "openai" || m.provider === "gemini"));
});

test("검수 제안: 편집 지시문은 삭제 제안으로, 본문 문장은 그대로", () => {
  assert.equal(asReplacement("해당 문장을 삭제합니다."), "");
  assert.equal(asReplacement("이 단락은 지워 주세요"), "");
  assert.equal(asReplacement("중복된 표현을 제거하세요."), "");
  assert.equal(asReplacement("불필요한 지방을 제거합니다."), "불필요한 지방을 제거합니다.");
  assert.equal(asReplacement("단풍은 10월 말에 절정입니다."), "단풍은 10월 말에 절정입니다.");
});
