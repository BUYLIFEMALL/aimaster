import test from "node:test";
import assert from "node:assert/strict";
import { runQualityChecks, summarizeChecks, topWords, normalizeWord } from "../lib/seoQuality.ts";

const status = (checks, id) => checks.find((check) => check.id === id)?.status;
const longBody = (keyword) => {
  const paragraph = (withKeyword) => `${withKeyword ? keyword : "이곳"}을 처음 가는 분이라면 이동 시간과 주차를 먼저 살펴보세요. 오전에 출발하면 붐비지 않아 여유롭게 둘러볼 수 있습니다. 근처 카페와 산책로를 함께 묶으면 하루 일정이 알차집니다.`;
  return Array.from({ length: 26 }, (_, index) => paragraph(index % 5 === 0)).join("\n\n");
};

test("점검표: 잘 쓴 글은 대부분 통과", () => {
  const checks = runQualityChecks({ title: "서울 근교 당일치기 여행 코스 추천, 주말에 가기 좋은 곳 5곳", body: longBody("서울 근교"), keywords: ["서울 근교"], strategy: "C-Rank 기본", imageCount: 3 });
  for (const id of ["title-length", "title-keyword", "title-keyword-front", "intro-keyword", "keyword-repeat", "body-length", "paragraph-length", "needs-check", "cliche", "images"]) assert.equal(status(checks, id), "pass", id);
  assert.equal(status(checks, "faq"), undefined, "AEO가 아니고 FAQ도 없으면 항목 자체를 빼야 함");
  assert.equal(summarizeChecks(checks).percent, 100);
});

test("점검표: 문제 있는 글은 경고", () => {
  const body = "결론적으로 이 글은 짧습니다. [확인 필요] 수치가 있습니다.\n\n" + "가".repeat(400);
  const checks = runQualityChecks({ title: "짧은 제목", body, keywords: ["캠핑"], strategy: "AEO", imageCount: 0 });
  for (const id of ["title-length", "title-keyword", "intro-keyword", "keyword-repeat", "body-length", "paragraph-length", "needs-check", "cliche", "faq", "images"]) assert.equal(status(checks, id), "warn", id);
  const summary = summarizeChecks(checks);
  assert.equal(summary.passed, 0);
});

test("점검표: 키워드가 없으면 키워드 항목은 건너뛰고 점수에서 뺌", () => {
  const checks = runQualityChecks({ title: "키워드 없이 쓴 제목이지만 길이는 충분히 길게 맞춘 제목", body: longBody("여행"), keywords: [], imageCount: 1 });
  assert.equal(status(checks, "title-keyword"), "skip");
  const summary = summarizeChecks(checks);
  assert.equal(summary.total, checks.filter((check) => check.status !== "skip").length);
});

test("점검표: 키워드 과다 반복 경고", () => {
  const body = Array.from({ length: 30 }, () => "캠핑 캠핑 캠핑 장비").join("\n\n");
  assert.equal(status(runQualityChecks({ title: "캠핑", body, keywords: ["캠핑"], imageCount: 1 }), "keyword-repeat"), "warn");
});

test("단어 빈도: 조사 떼기·불용어 제외·상위 정렬", () => {
  assert.equal(normalizeWord("카페에서"), "카페");
  assert.equal(normalizeWord("고양이"), "고양이", "명사 끝 '이'는 떼지 않음");
  assert.equal(normalizeWord("책을"), "책을", "남는 글자가 2자 미만이면 그대로");
  assert.equal(normalizeWord("있습니다"), "", "서술어는 세지 않음");
  assert.equal(normalizeWord("좋아요"), "");
  assert.equal(normalizeWord("아이들이"), "아이들");
  const words = topWords("카페에서 커피를 마셨습니다. 카페는 조용했고 커피가 맛있었습니다. 그리고 카페 앞 산책로. 그리고 2026 2026");
  assert.deepEqual(words[0], { word: "카페", count: 3 });
  assert.ok(!words.some((item) => item.word === "그리고"));
  assert.ok(!words.some((item) => item.word === "2026"));
  assert.ok(words.every((item) => item.count >= 2));
});

test("전략 이름: 화면 목록 = 생성기 목록, 생성 API는 생성기 목록을 사용 (v1.74 회귀 방지)", async () => {
  const { readFile } = await import("node:fs/promises");
  const shared = await readFile(new URL("../components/studio/shared.ts", import.meta.url), "utf8");
  const generator = await readFile(new URL("../lib/ai/generator.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/drafts/generate/route.ts", import.meta.url), "utf8");
  const uiNames = [...shared.slice(shared.indexOf("export const strategies"), shared.indexOf("];")).matchAll(/\["([^"]+)",/g)].map((match) => match[1]);
  const guideBlock = generator.slice(generator.indexOf("STRATEGY_GUIDE"), generator.indexOf("};", generator.indexOf("STRATEGY_GUIDE")));
  const guideNames = [...guideBlock.matchAll(/^\s*"?([^":\n]+?)"?:\s*"/gm)].map((match) => match[1].trim());
  assert.equal(uiNames.length, 5);
  assert.deepEqual(guideNames, uiNames);
  assert.match(route, /new Set\(SEO_STRATEGY_NAMES\)/);
});

test("여러 단어 키워드: 단어가 모두 있으면 포함으로 판정 (v1.75)", () => {
  const body = longBody("서울 당일치기 근교");
  const checks = runQualityChecks({ title: "당일치기로 가는 서울 근교 여행 코스 추천, 주말 나들이 5곳", body, keywords: ["서울 근교 당일치기"], imageCount: 1 });
  assert.equal(status(checks, "title-keyword"), "pass");
  assert.equal(checks.find((check) => check.id === "title-keyword")?.detail, "단어별로 포함됨");
  assert.equal(status(checks, "intro-keyword"), "pass");
  assert.equal(status(checks, "keyword-repeat"), "pass");
  const missing = runQualityChecks({ title: "서울 여행 코스 추천, 주말에 가볍게 다녀오기 좋은 다섯 곳", body, keywords: ["서울 근교 캠핑"], imageCount: 1 });
  assert.equal(status(missing, "title-keyword"), "warn", "단어 하나라도 빠지면 경고");
});
