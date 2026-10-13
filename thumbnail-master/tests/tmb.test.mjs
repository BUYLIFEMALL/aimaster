import test from "node:test";
import assert from "node:assert/strict";
import { cleanInputs, missingInputs, cleanDocText, DOC_MAX_CHARS, isOpt, isUuid, imagePath, isOwnImagePath, stageOf, cleanName } from "../src/lib/tmb/validate.ts";
import { normalizeStrategy, parseJsonLoose, mainWarning } from "../src/lib/tmb/strategy.ts";
import { strategySystem, strategyUser, imagePrompt, editPrompt, subjectBlock, yearGuard } from "../src/lib/tmb/prompts.ts";
import { AUDIENCES, audienceInfo } from "../src/lib/tmb/audience.ts";
import { EMPTY_INPUTS } from "../src/lib/tmb/types.ts";

const UID = "11111111-2222-4333-8444-555555555555";
const PID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const FID = "99999999-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const rawStrategy = {
  strategySummary: "요약",
  imagePrompt: "A shocked Korean woman holding a bowl of pasta, hyper-realistic",
  imagePromptKo: "놀란 한국 여성",
  option1: { label: "직관형", hookMainText: "5분 완성 파스타", hookSubText: "재료 3가지", textStyleSuggestion: "노랑+검정" },
  option2: { label: "호기심형", hookMainText: "아직도 이렇게 끓여요?", hookSubText: "셰프는 안 하는 실수", textStyleSuggestion: "흰색+빨강" },
};

test("cleanInputs: 잘못된 값은 기본값으로", () => {
  const i = cleanInputs({ topic: "  파스타   레시피 ", audience: "nope", subject: { type: "alien", gender: "x", age: "?", ethnicity: "?" }, style: { border: "laser", size: "8K", withText: false, channelName: " GPT PARK " } });
  assert.equal(i.topic, "파스타 레시피");
  assert.equal(i.audience, "adults");
  assert.equal(i.subject.type, "person");
  assert.equal(i.subject.gender, "auto");
  assert.equal(i.subject.ethnicity, "한국인 (Korean)");
  assert.equal(i.style.border, "none");
  assert.equal(i.style.size, "2K");
  assert.equal(i.style.withText, false);
  assert.equal(i.style.channelName, "GPT PARK");
  assert.deepEqual(cleanInputs(null).subject, EMPTY_INPUTS.subject);
});

test("missingInputs: 주제·동물/사물 설명 필수", () => {
  assert.equal(missingInputs(cleanInputs({})), "영상 주제를 입력해 주세요.");
  assert.equal(missingInputs(cleanInputs({ topic: "a", subject: { type: "animal" } })), "동물 종류를 입력해 주세요.");
  assert.equal(missingInputs(cleanInputs({ topic: "a", subject: { type: "object", description: "아이폰" } })), null);
  assert.equal(missingInputs(cleanInputs({ topic: "a", subject: { type: "none" } })), null);
});

test("cleanDocText: 제어문자 제거·길이 제한", () => {
  const r = cleanDocText("a\u0000b\u0007c" + "x".repeat(DOC_MAX_CHARS));
  assert.equal(r.text.length, DOC_MAX_CHARS);
  assert.equal(r.truncated, true);
  assert.equal(r.text.startsWith("abc"), true);
  assert.deepEqual(cleanDocText(5), { text: "", truncated: false });
});

test("normalizeStrategy·parseJsonLoose", () => {
  const s = normalizeStrategy(rawStrategy);
  assert.ok(s);
  assert.equal(s.a.main, "5분 완성 파스타");
  assert.equal(s.b.styleHint, "흰색+빨강");
  assert.equal(normalizeStrategy({ ...rawStrategy, option2: {} }), null);
  assert.equal(normalizeStrategy({ ...rawStrategy, imagePrompt: "" }), null);
  assert.equal(normalizeStrategy("x"), null);
  assert.ok(normalizeStrategy(parseJsonLoose("```json\n" + JSON.stringify(rawStrategy) + "\n```")));
  const again = normalizeStrategy(s);
  assert.equal(again.a.main, s.a.main);
});

test("mainWarning: 3~5단어 권장", () => {
  assert.equal(mainWarning("5분 완성 파스타"), null);
  assert.match(mainWarning("이건 정말 너무너무 길고 길고 긴 문구 입니다 진짜로"), /3~5단어/);
  assert.match(mainWarning("  "), /입력/);
});

test("프롬프트: 당해 연도·타겟·한국인 기본·A/B 안", () => {
  const year = new Date().getFullYear();
  assert.ok(yearGuard().includes(`${year}년`));
  const i = cleanInputs({ topic: "파스타", audience: "seniors" });
  const sys = strategySystem(i);
  assert.ok(sys.includes(`${year}년`) && sys.includes("시니어") && sys.includes("Korean") && sys.includes("A안") && sys.includes("B안"));
  assert.ok(strategyUser("파스타", "문서", ["이전"]).includes("[첨부 문서 내용 시작]"));
  assert.ok(strategyUser("파스타", "", ["이전 문구"]).includes("이전 문구"));
  assert.ok(!strategyUser("파스타", "").includes("첨부"));
});

test("subjectBlock: 사람/동물/사물/없음", () => {
  assert.ok(subjectBlock(cleanInputs({ subject: { type: "person", gender: "male", age: "30-40대 (Adult)", ethnicity: "백인 (Caucasian)" } }).subject).includes("Caucasian"));
  assert.ok(subjectBlock(cleanInputs({ subject: { type: "animal", description: "골든 리트리버" } }).subject).includes("골든 리트리버"));
  assert.ok(subjectBlock(cleanInputs({ subject: { type: "none" } }).subject).includes("Do NOT feature"));
  assert.ok(subjectBlock(cleanInputs({}).subject).includes("Korean"));
});

test("imagePrompt: 문구·테두리·브랜딩·시니어 규칙·문구 없음", () => {
  const s = normalizeStrategy(rawStrategy);
  const base = cleanInputs({ topic: "파스타", audience: "seniors", style: { border: "neon", channelName: "GPTPARK", withText: true } });
  const pa = imagePrompt(s, "a", base);
  assert.ok(pa.includes('MAIN TEXT: "5분 완성 파스타"') && pa.includes("GLOWING NEON") && pa.includes('"GPTPARK"') && pa.includes("SENIOR AUDIENCE MODE"));
  const pb = imagePrompt(s, "b", base);
  assert.ok(pb.includes("아직도 이렇게 끓여요?") && pb.includes("흰색+빨강"));
  const noText = imagePrompt(s, "a", cleanInputs({ topic: "파스타", style: { withText: false } }));
  assert.ok(noText.includes("Do NOT render any text") && !noText.includes("MAIN TEXT"));
  assert.ok(editPrompt("텍스트를 노란색으로").includes("텍스트를 노란색으로"));
});

test("타겟 4종", () => {
  assert.equal(AUDIENCES.length, 4);
  assert.equal(audienceInfo("zzz").id, "adults");
});

test("경로·ID 검증: 본인 프로젝트 폴더만", () => {
  assert.equal(isOpt("a"), true);
  assert.equal(isOpt("c"), false);
  assert.equal(isUuid(PID), true);
  assert.equal(isUuid("../x"), false);
  const p = imagePath(UID, PID, "a", FID);
  assert.equal(p, `${UID}/${PID}/a-${FID}.jpg`);
  assert.equal(isOwnImagePath(UID, PID, p), true);
  assert.equal(isOwnImagePath("99999999-2222-4333-8444-555555555555", PID, p), false);
  assert.equal(isOwnImagePath(UID, PID, `${UID}/${PID}/../x.jpg`), false);
  assert.equal(isOwnImagePath(UID, PID, 5), false);
});

test("stageOf·cleanName", () => {
  assert.equal(stageOf(null, false), "input");
  assert.equal(stageOf(normalizeStrategy(rawStrategy), false), "strategy");
  assert.equal(stageOf(normalizeStrategy(rawStrategy), true), "image");
  assert.equal(cleanName("  "), "제목 없는 썸네일");
  assert.equal(cleanName(" 파스타  썸네일 "), "파스타 썸네일");
});
