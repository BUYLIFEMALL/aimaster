import test from "node:test";
import assert from "node:assert/strict";
import { ALL_TESTS, getTest, testsOf } from "../src/lib/tests/registry.ts";
import { scoreTest, validateAnswers } from "../src/lib/tests/scoring.ts";
import { TYPE16_PROFILES } from "../src/lib/tests/content/type16Profiles.ts";
import { ATTACHMENT_PROFILES, BEHAVIOR_PROFILES, BIGFIVE_TEXT, ENNEAGRAM_PROFILES } from "../src/lib/tests/content/psychProfiles.ts";
import { buildReport, compareResults, describeForAi } from "../src/lib/tests/report.ts";
import { analysisPrompt, profilePrompt, normalizeAnalysis, normalizeProfile, yearGuard } from "../src/lib/tests/ai.ts";
import { AXES, AXIS_POLES } from "../src/lib/tests/types.ts";
import { CRISIS_NOTICE, TEMPERAMENT_TEXT, WELLBEING_TEXT } from "../src/lib/tests/content/careTests.ts";
import { isSensitive } from "../src/lib/tests/registry.ts";

const all = (n, v) => Array(n).fill(v);

test("검사 목록: 16종, id 중복 없음, 그룹별 개수", () => {
  assert.equal(ALL_TESTS.length, 16);
  assert.equal(new Set(ALL_TESTS.map((t) => t.id)).size, 16);
  assert.equal(testsOf("type16").length, 10);
  assert.equal(testsOf("psych").length, 5);
  assert.equal(testsOf("care").length, 1);
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

test("기질·성향 점검: 요인 균형·역문항·순위", () => {
  const t = getTest("temperament");
  assert.equal(t.questions.length, 24);
  for (const k of ["explore", "caution", "bond", "persist"]) {
    const qs = t.questions.filter((q) => q.trait === k);
    assert.equal(qs.length, 6, k);
    assert.ok(qs.some((q) => q.reverse) && qs.some((q) => !q.reverse), k + " 역문항 혼합");
    assert.ok(TEMPERAMENT_TEXT[k].low && TEMPERAMENT_TEXT[k].mid && TEMPERAMENT_TEXT[k].high);
  }
  const a = t.questions.map((q) => (q.trait === "persist" ? (q.reverse ? 1 : 5) : q.trait === "explore" ? (q.reverse ? 2 : 4) : 3));
  const r = scoreTest(t, a);
  assert.equal(r.code, "persist");
  assert.deepEqual(r.ranking.slice(0, 2), ["persist", "explore"]);
  assert.match(buildReport(t, r).title, /지속력 \+ 탐색 성향/);
  assert.equal(scoreTest(t, all(24, 3)).code, "explore", "동점이면 정의된 순서");
});

test("마음 상태 점검: 점수 방향·수준·고정 안내·민감 처리", () => {
  const t = getTest("wellbeing");
  assert.equal(t.questions.length, 20);
  for (const k of ["tension", "energy", "sleep", "support"]) {
    assert.equal(t.questions.filter((q) => q.trait === k).length, 5, k);
    assert.ok(WELLBEING_TEXT[k].low && WELLBEING_TEXT[k].mid && WELLBEING_TEXT[k].high && WELLBEING_TEXT[k].tip);
  }
  // 모든 부담 문항 5점, 지지·회복 문항 1점 = 최대 부담
  const worst = scoreTest(t, t.questions.map((q) => (q.reverse ? 1 : 5)));
  assert.ok(worst.traits.every((x) => x.score === 100 && x.level === "high"));
  assert.equal(worst.code, "high");
  const best = scoreTest(t, t.questions.map((q) => (q.reverse ? 5 : 1)));
  assert.ok(best.traits.every((x) => x.score === 0));
  assert.equal(best.code, "low");
  assert.equal(scoreTest(t, all(20, 3)).code, "mid");
  const rep = buildReport(t, worst);
  assert.match(rep.summary, /긴장·스트레스|에너지·의욕|수면·회복|관계·지지/);
  assert.ok(rep.tips.length === 3 && rep.notes.length === 1);
  assert.ok(CRISIS_NOTICE.lines.some((l) => l.includes("109")) && CRISIS_NOTICE.lines.some((l) => l.includes("1577-0199")) && CRISIS_NOTICE.lines.some((l) => l.includes("1388")));
  assert.equal(isSensitive("wellbeing"), true);
  assert.equal(isSensitive("bigfive"), false);
  // 진단 용어를 문항·해석에 쓰지 않는다
  const text = JSON.stringify([t, WELLBEING_TEXT]);
  assert.ok(!/우울증|불안장애|공황|자살|자해|진단됩/.test(text));
});

test("결과 비교: 변화가 있을 때만 문장 생성", () => {
  const t = getTest("bigfive");
  const base = t.questions.map(() => 3);
  const up = t.questions.map((q) => (q.trait === "E" ? (q.reverse ? 1 : 5) : 3));
  const a = scoreTest(t, base);
  const b = scoreTest(t, up);
  assert.deepEqual(compareResults(a, a), []);
  const c = compareResults(a, b);
  assert.ok(c.some((s) => s.startsWith("외향성: 50점 → 100점")));
  const t16 = getTest("type16-standard");
  const x = scoreTest(t16, t16.questions.map((q) => (q.pole === "E" || q.pole === "S" ? 5 : 1)));
  const y = scoreTest(t16, t16.questions.map((q) => (q.pole === "I" || q.pole === "S" ? 5 : 1)));
  assert.ok(compareResults(x, y).some((s) => s.includes("E → I")));
});

test("종합 프로필 정규화: changes 필드는 선택, 최대 2개", () => {
  const p = normalizeProfile({ headline: "h", commonThemes: ["a"], tensions: [], strengths: [], growthPlan: [], changes: ["x", "y", "z"], caution: "" });
  assert.equal(p.changes.length, 2);
  assert.deepEqual(normalizeProfile({ headline: "h", commonThemes: ["a"] }).changes, []);
});

test("변화 추이: 2회 이상만, 시간순, 최대 12점, 민감 검사 제외", async () => {
  const { buildTrends } = await import("../src/lib/tests/trends.ts");
  const big = getTest("bigfive");
  const t16 = getTest("type16-standard");
  const wb = getTest("wellbeing");
  const mkRow = (test, fill, day) => ({ test_id: test.id, result: scoreTest(test, test.questions.map(() => fill)), created_at: `2026-10-${String(day).padStart(2, "0")}T00:00:00Z` });
  const rows = [mkRow(big, 5, 3), mkRow(big, 1, 1), mkRow(t16, 3, 2), mkRow(wb, 5, 1), mkRow(wb, 1, 2)];
  const trends = buildTrends(rows, isSensitive);
  assert.equal(trends.length, 1, "bigfive만(16유형 1회·마음 상태 제외)");
  assert.equal(trends[0].testId, "bigfive");
  assert.deepEqual(trends[0].points.map((p) => p.at.slice(8, 10)), ["01", "03"]);
  assert.equal(trends[0].series.length, 5);
  assert.equal(trends[0].points[0].scores.O, 50 - 50 + scoreTest(big, big.questions.map(() => 1)).traits[0].score);
  const many = Array.from({ length: 15 }, (_, i) => mkRow(big, 3, i + 1));
  assert.equal(buildTrends(many)[0].points.length, 12);
  const axisRows = [mkRow(t16, 5, 1), mkRow(t16, 1, 2)];
  const ax = buildTrends(axisRows)[0];
  assert.equal(ax.series.length, 4);
  assert.ok(ax.series[0].label.includes("E"));
});

test("종합 프로필 가중치: 정규화·프롬프트 문구", async () => {
  const { normalizeWeights, WEIGHT_LABELS } = await import("../src/lib/tests/ai.ts");
  const w = normalizeWeights({ a: 3, b: 0, c: 7, d: "2", zzz: 3 }, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(w, { a: 3, b: 0, c: 1, d: 1, e: 1 });
  assert.deepEqual(normalizeWeights(null, ["a"]), { a: 1 });
  assert.deepEqual(normalizeWeights([1, 2], ["a"]), { a: 1 });
  assert.deepEqual([WEIGHT_LABELS[1], WEIGHT_LABELS[2], WEIGHT_LABELS[3]], ["참고", "중요", "핵심"]);
  const p = profilePrompt(["중요도: 핵심\n검사: x"], new Date("2026-10-14T00:00:00Z"));
  assert.match(p.system, /핵심 > 중요 > 참고/);
});

test("타로점 연결(v1.24): 질문 문장에 점수 숫자를 넣지 않고, 3장 스프레드로 보낸다", async () => {
  const { tarotQuestion, tarotLink } = await import("../src/lib/tarotLink.ts");
  for (const t of ALL_TESTS) {
    const r = scoreTest(t, all(t.questions.length, 4));
    const q = tarotQuestion(r, buildReport(t, r), isSensitive(t.id));
    assert.ok(q.length > 10 && q.length <= 300, t.id);
    assert.doesNotMatch(q, /\d+\s*(점|%)/, `${t.id}: 점수가 질문에 들어감`);
    const u = new URL(tarotLink(q));
    assert.equal(u.searchParams.get("spread"), "three_cards");
    assert.equal(u.searchParams.get("q"), q);
  }
});

test("캐릭코드 연결(v1.26): 16유형 결과만 /result/<유형코드>?축별 우세%&from= 로, 다른 검사는 연결 없음", async () => {
  const { characterLink } = await import("../src/lib/tarotLink.ts");
  for (const t of ALL_TESTS) {
    const r = scoreTest(t, all(t.questions.length, 4));
    const link = characterLink(r);
    if (r.kind === "type16") {
      const u = new URL(link);
      assert.match(u.pathname, /^\/result\/[EI][SN][TF][JP]$/, t.id);
      assert.equal(u.searchParams.get("from"), "personality-suite");
      for (const ax of ["EI", "SN", "TF", "JP"]) { const v = Number(u.searchParams.get(ax)); assert.ok(v >= 50 && v <= 100, `${t.id} ${ax}=${v}`); }
    }
    else assert.equal(link, null, t.id);
  }
});

test("성격코드 연결(v1.27): 16유형만 personality-code /result/<유형>?축%&from=, 다른 검사는 없음", async () => {
  const { personalityCodeLink, characterLink } = await import("../src/lib/tarotLink.ts");
  for (const t of ALL_TESTS) {
    const r = scoreTest(t, all(t.questions.length, 2));
    const link = personalityCodeLink(r);
    if (r.kind !== "type16") { assert.equal(link, null, t.id); continue; }
    const u = new URL(link);
    assert.equal(u.host, "personality-code.buylife.xyz");
    assert.equal(u.search, new URL(characterLink(r)).search, "캐릭코드와 같은 값");
  }
});
