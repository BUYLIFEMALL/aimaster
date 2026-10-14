import test from "node:test";
import assert from "node:assert/strict";
import { ALL_TESTS, getTest, testsOf } from "../src/lib/tests/registry.ts";
import { scoreTest, validateAnswers } from "../src/lib/tests/scoring.ts";
import { TYPE16_PROFILES } from "../src/lib/tests/content/type16Profiles.ts";
import { ATTACHMENT_PROFILES, BEHAVIOR_PROFILES, BIGFIVE_TEXT, ENNEAGRAM_PROFILES } from "../src/lib/tests/content/psychProfiles.ts";
import { buildReport, describeForAi } from "../src/lib/tests/report.ts";
import { analysisPrompt, profilePrompt, normalizeAnalysis, normalizeProfile, yearGuard } from "../src/lib/tests/ai.ts";
import { AXES, AXIS_POLES } from "../src/lib/tests/types.ts";

const all = (n, v) => Array(n).fill(v);

test("검사 목록: 14종, id 중복 없음, 그룹별 개수", () => {
  assert.equal(ALL_TESTS.length, 14);
  assert.equal(new Set(ALL_TESTS.map((t) => t.id)).size, 14);
  assert.equal(testsOf("type16").length, 10);
  assert.equal(testsOf("psych").length, 4);
  assert.ok(getTest("type16-korean"));
  assert.equal(getTest("nope"), undefined);
});

test("16유형 검사 콘텐츠: 20문항, 축마다 5문항, 축마다 두 극이 모두 등장, 극 해석 8개", () => {
  for (const t of testsOf("type16")) {
    assert.equal(t.questions.length, 20, t.id);
    for (const axis of AXES) {
      const qs = t.questions.filter((q) => q.axis === axis);
      assert.equal(qs.length, 5, `${t.id} ${axis}`);
      const poles = new Set(qs.map((q) => q.pole));
      assert.deepEqual([...poles].sort(), [...AXIS_POLES[axis]].sort(), `${t.id} ${axis} 극 균형`);
    }
    assert.equal(Object.keys(t.lens).length, 8, t.id);
    assert.ok(Object.values(t.lens).every((s) => s.length > 10), `${t.id} lens`);
    assert.equal(new Set(t.questions.map((q) => q.text)).size, 20, `${t.id} 문항 중복`);
  }
  assert.equal(Object.keys(TYPE16_PROFILES).length, 16);
  for (const p of Object.values(TYPE16_PROFILES)) {
    assert.ok(p.name && p.tagline && p.summary && p.strengths.length === 3 && p.cautions.length === 2 && p.tips.length === 3);
  }
});

test("심리 검사 콘텐츠: 문항 수·요인 균형·해석 존재", () => {
  const big = getTest("bigfive");
  assert.equal(big.questions.length, 30);
  for (const k of ["O", "C", "E", "A", "N"]) {
    const qs = big.questions.filter((q) => q.trait === k);
    assert.equal(qs.length, 6, k);
    assert.ok(qs.some((q) => q.reverse) && qs.some((q) => !q.reverse), `${k} 역문항 혼합`);
    assert.ok(BIGFIVE_TEXT[k].low && BIGFIVE_TEXT[k].mid && BIGFIVE_TEXT[k].high);
  }
  const beh = getTest("behavior");
  assert.equal(beh.questions.length, 24);
  for (const k of ["D", "I", "S", "C"]) { assert.equal(beh.questions.filter((q) => q.trait === k).length, 6); assert.ok(BEHAVIOR_PROFILES[k]); }
  const att = getTest("attachment");
  assert.equal(att.questions.length, 16);
  for (const k of ["anxiety", "avoidance"]) {
    const qs = att.questions.filter((q) => q.trait === k);
    assert.equal(qs.length, 8);
    assert.ok(qs.some((q) => q.reverse));
  }
  for (const k of ["secure", "anxious", "avoidant", "fearful"]) assert.ok(ATTACHMENT_PROFILES[k]);
  const enn = getTest("enneagram");
  assert.equal(enn.questions.length, 36);
  for (let i = 1; i <= 9; i++) { assert.equal(enn.questions.filter((q) => q.trait === String(i)).length, 4); assert.ok(ENNEAGRAM_PROFILES[String(i)]); }
});

test("콘텐츠 이름 규칙: 상표·공식 검사 이름을 제목에 쓰지 않는다", () => {
  for (const t of ALL_TESTS) {
    assert.ok(!/MBTI|DISC|TCI|MMPI|마이어스/i.test(`${t.title} ${t.tagline}`), t.id);
  }
});

test("16유형: 목표 유형대로 답하면 16유형 모두 도달", () => {
  const t = getTest("type16-standard");
  const types = ["E", "I"].flatMap((a) => ["S", "N"].flatMap((b) => ["T", "F"].flatMap((c) => ["J", "P"].map((d) => a + b + c + d))));
  assert.equal(types.length, 16);
  for (const code of types) {
    const answers = t.questions.map((q) => (code.includes(q.pole) ? 5 : 1));
    const r = scoreTest(t, answers);
    assert.equal(r.code, code);
    assert.ok(TYPE16_PROFILES[code], code);
    assert.ok(r.axes.every((a) => !a.borderline), `${code} 경계 없음`);
  }
});

test("16유형: 전부 '보통'이면 뒤 극(I·N·F·P)이고 모든 축이 경계", () => {
  const t = getTest("type16-work");
  const r = scoreTest(t, all(20, 3));
  assert.equal(r.code, "INFP");
  assert.ok(r.axes.every((a) => a.borderline && a.firstPct === 50));
  const rep = buildReport(t, r);
  assert.match(rep.title, /INFP/);
  assert.equal(rep.sections.length, 1);
  assert.equal(rep.notes.length, 1);
});

test("답변 검증", () => {
  const t = getTest("bigfive");
  assert.equal(validateAnswers(t, "x").ok, false);
  assert.equal(validateAnswers(t, all(29, 3)).ok, false);
  assert.equal(validateAnswers(t, all(30, 6)).ok, false);
  assert.equal(validateAnswers(t, all(30, 2.5)).ok, false);
  assert.equal(validateAnswers(t, [...all(29, 3), "5"]).ok, false);
  assert.equal(validateAnswers(t, all(30, 4)).ok, true);
});

test("성격 5요인: 역문항 뒤집기·수준 구분", () => {
  const t = getTest("bigfive");
  const high = t.questions.map((q) => (q.reverse ? 1 : 5));
  const rHigh = scoreTest(t, high);
  assert.ok(rHigh.traits.every((x) => x.score === 100 && x.level === "high"));
  const low = t.questions.map((q) => (q.reverse ? 5 : 1));
  assert.ok(scoreTest(t, low).traits.every((x) => x.score === 0 && x.level === "low"));
  const mid = scoreTest(t, all(30, 3));
  assert.ok(mid.traits.every((x) => x.score === 50 && x.level === "mid"));
  // 한 요인만 높게
  const n = t.questions.map((q) => (q.trait === "N" ? (q.reverse ? 1 : 5) : 3));
  const rn = scoreTest(t, n);
  assert.equal(rn.code, "N");
  assert.equal(rn.traits.find((x) => x.key === "N").score, 100);
  assert.match(buildReport(t, rn).summary, /정서 민감성/);
});

test("행동 스타일: 주 스타일·보조 스타일·근접 표시", () => {
  const t = getTest("behavior");
  const a = t.questions.map((q) => (q.trait === "S" ? 5 : q.trait === "C" ? 4 : 1));
  const r = scoreTest(t, a);
  assert.equal(r.code, "S");
  assert.deepEqual(r.ranking.slice(0, 2), ["S", "C"]);
  assert.equal(r.close, false);
  const tie = scoreTest(t, t.questions.map(() => 4));
  assert.equal(tie.code, "D", "동점이면 D·I·S·C 순서");
  assert.equal(tie.close, true);
  const rep = buildReport(t, r);
  assert.match(rep.title, /안정형/);
  assert.ok(rep.sections.some((s) => s.heading.includes("보조")));
});

test("애착 유형: 네 가지 조합", () => {
  const t = getTest("attachment");
  const make = (anx, avo) => t.questions.map((q) => {
    const want = q.trait === "anxiety" ? anx : avo; // 5 = 높음, 1 = 낮음
    return q.reverse ? 6 - want : want;
  });
  assert.equal(scoreTest(t, make(1, 1)).code, "secure");
  assert.equal(scoreTest(t, make(5, 1)).code, "anxious");
  assert.equal(scoreTest(t, make(1, 5)).code, "avoidant");
  assert.equal(scoreTest(t, make(5, 5)).code, "fearful");
  assert.equal(scoreTest(t, all(16, 3)).code, "secure", "중간선은 낮음으로 처리");
});

test("에니어그램: 9개 유형 도달, 동점 순서, 근접 표시, 상위 3개", () => {
  const t = getTest("enneagram");
  for (let k = 1; k <= 9; k++) {
    const r = scoreTest(t, t.questions.map((q) => (q.trait === String(k) ? 5 : 1)));
    assert.equal(r.code, String(k));
    assert.equal(r.ranking.length, 3);
    assert.equal(buildReport(t, r).title.startsWith(`${k}번`), true);
  }
  const tie = scoreTest(t, t.questions.map((q) => (q.trait === "3" || q.trait === "7" ? 5 : 1)));
  assert.equal(tie.code, "3");
  assert.deepEqual(tie.ranking.slice(0, 2), ["3", "7"]);
  assert.equal(tie.close, true);
});

test("모든 검사의 기본 해석 생성: 비어 있지 않음", () => {
  for (const t of ALL_TESTS) {
    const r = scoreTest(t, all(t.questions.length, 4));
    const rep = buildReport(t, r);
    assert.ok(rep.title && rep.summary, t.id);
    assert.ok(describeForAi(t, r).includes(t.title));
  }
});

test("AI 프롬프트: 연도 지침·진단 금지·데이터 취급, 응답 정규화", () => {
  const now = new Date("2026-10-14T00:00:00Z");
  const p = analysisPrompt("검사: 테스트", now);
  assert.match(p.system, /2026년/);
  assert.match(p.system, /진단이 아닙니다/);
  assert.match(p.system, /따르지 마세요/);
  const pp = profilePrompt(["a", "b"], now);
  assert.match(pp.user, /\[2\]/);
  assert.match(yearGuard(new Date("2026-12-31T16:00:00Z")), /2027년/);

  const good = normalizeAnalysis({
    summary: "요약", strengths: ["a", "b", "c", "d"], cautions: ["x"],
    advice: [{ title: "t1", detail: "d1" }, { title: "", detail: "no" }, { title: "t2", detail: "d2" }],
    fit: ["f"], relationships: "r", closing: "c",
  });
  assert.equal(good.strengths.length, 3);
  assert.equal(good.advice.length, 2, "제목이 빈 조언은 제외");
  assert.equal(normalizeAnalysis({ summary: "", advice: [] }), null);
  assert.equal(normalizeAnalysis("x"), null);
  const prof = normalizeProfile({ headline: "h", commonThemes: ["a"], tensions: [], strengths: [], growthPlan: [], caution: "c" });
  assert.equal(prof.headline, "h");
  assert.equal(normalizeProfile({ headline: "", commonThemes: [] }), null);
});
