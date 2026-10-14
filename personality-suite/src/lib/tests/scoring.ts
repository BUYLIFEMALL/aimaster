import {
  ANSWER_MAX, ANSWER_MIN, AXES, AXIS_POLES,
  type AxisScore, type ScoredResult, type Test, type TraitScore,
} from "./types";

// 점수 계산(순수 함수, 서버가 답변으로 다시 계산한다 — 클라이언트가 보낸 점수는 믿지 않는다).

export type ValidateOutcome = { ok: true; answers: number[] } | { ok: false; error: string };

/** 답변 배열 검증: 길이 = 문항 수, 각 값은 1~5 정수 */
export function validateAnswers(test: Test, raw: unknown): ValidateOutcome {
  if (!Array.isArray(raw)) return { ok: false, error: "답변 형식이 올바르지 않습니다." };
  if (raw.length !== test.questions.length) return { ok: false, error: `모든 문항(${test.questions.length}개)에 답해 주세요.` };
  const out: number[] = [];
  for (const v of raw) {
    const n = typeof v === "number" ? v : NaN;
    if (!Number.isInteger(n) || n < ANSWER_MIN || n > ANSWER_MAX) return { ok: false, error: "답변 값이 올바르지 않습니다." };
    out.push(n);
  }
  return { ok: true, answers: out };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const to100 = (m: number) => Math.round(((m - 1) / 4) * 100);

function traitMeans(test: Extract<Test, { questions: { trait: string }[] }>, answers: number[]): Map<string, number> {
  const buckets = new Map<string, number[]>();
  test.questions.forEach((q, i) => {
    const v = q.reverse ? 6 - answers[i] : answers[i];
    buckets.set(q.trait, [...(buckets.get(q.trait) ?? []), v]);
  });
  const out = new Map<string, number>();
  for (const [k, v] of buckets) out.set(k, mean(v));
  return out;
}

// ---- 16유형 ----
function scoreType16(test: Extract<Test, { kind: "type16" }>, answers: number[]): ScoredResult {
  const axes: AxisScore[] = AXES.map((axis) => {
    const [first, second] = AXIS_POLES[axis];
    let sum = 0;
    let max = 0;
    test.questions.forEach((q, i) => {
      if (q.axis !== axis) return;
      const v = answers[i] - 3; // -2..+2
      sum += q.pole === first ? v : -v;
      max += 2;
    });
    const firstPct = max === 0 ? 50 : Math.round(50 + (sum / max) * 50);
    // 정확히 중립(0점)이면 뒤 극을 택하되 경계로 표시한다
    const chosen = sum > 0 ? first : second;
    return { axis, firstPct, poles: [first, second], chosen, borderline: Math.abs(firstPct - 50) < 10 };
  });
  const code = axes.map((a) => a.chosen).join("");
  return { testId: test.id, kind: "type16", headline: code, code, axes };
}

// ---- 성격 5요인 ----
const BIGFIVE_LABELS: Record<string, string> = { O: "개방성", C: "성실성", E: "외향성", A: "친화성", N: "정서 민감성" };
export const BIGFIVE_ORDER = ["O", "C", "E", "A", "N"];

function level(score: number): "low" | "mid" | "high" {
  return score < 40 ? "low" : score > 60 ? "high" : "mid";
}

function scoreBigFive(test: Extract<Test, { kind: "bigfive" }>, answers: number[]): ScoredResult {
  const m = traitMeans(test, answers);
  const traits: TraitScore[] = BIGFIVE_ORDER.map((k) => {
    const score = to100(m.get(k) ?? 3);
    return { key: k, label: BIGFIVE_LABELS[k], score, level: level(score) };
  });
  const top = [...traits].sort((a, b) => b.score - a.score || BIGFIVE_ORDER.indexOf(a.key) - BIGFIVE_ORDER.indexOf(b.key))[0];
  return { testId: test.id, kind: "bigfive", headline: `${top.label}이 두드러진 유형`, code: top.key, traits };
}

// ---- 행동 스타일(D·I·S·C) ----
export const BEHAVIOR_LABELS: Record<string, string> = { D: "주도형", I: "사교형", S: "안정형", C: "신중형" };
export const BEHAVIOR_ORDER = ["D", "I", "S", "C"];

function scoreBehavior(test: Extract<Test, { kind: "behavior" }>, answers: number[]): ScoredResult {
  const m = traitMeans(test, answers);
  const traits: TraitScore[] = BEHAVIOR_ORDER.map((k) => ({ key: k, label: BEHAVIOR_LABELS[k], score: to100(m.get(k) ?? 3) }));
  const ranked = [...traits].sort((a, b) => b.score - a.score || BEHAVIOR_ORDER.indexOf(a.key) - BEHAVIOR_ORDER.indexOf(b.key));
  const primary = ranked[0];
  const secondary = ranked[1];
  return {
    testId: test.id, kind: "behavior", headline: `${primary.label} (${primary.key}) · 보조 ${secondary.label}`, code: primary.key,
    traits, ranking: ranked.map((t) => t.key), close: primary.score - secondary.score <= 5,
  };
}

// ---- 애착 유형 ----
export const ATTACHMENT_LABELS: Record<string, string> = { secure: "안정형", anxious: "불안형", avoidant: "회피형", fearful: "혼란형" };

function scoreAttachment(test: Extract<Test, { kind: "attachment" }>, answers: number[]): ScoredResult {
  const m = traitMeans(test, answers);
  const anx = m.get("anxiety") ?? 3;
  const avo = m.get("avoidance") ?? 3;
  const highAnx = anx > 3;
  const highAvo = avo > 3;
  const code = highAnx && highAvo ? "fearful" : highAnx ? "anxious" : highAvo ? "avoidant" : "secure";
  const traits: TraitScore[] = [
    { key: "anxiety", label: "관계 불안", score: to100(anx), level: level(to100(anx)) },
    { key: "avoidance", label: "친밀감 회피", score: to100(avo), level: level(to100(avo)) },
  ];
  return { testId: test.id, kind: "attachment", headline: ATTACHMENT_LABELS[code], code, traits, close: Math.abs(anx - 3) < 0.25 || Math.abs(avo - 3) < 0.25 };
}

// ---- 에니어그램 ----
export const ENNEAGRAM_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function scoreEnneagram(test: Extract<Test, { kind: "enneagram" }>, answers: number[]): ScoredResult {
  const sums = new Map<string, number>();
  test.questions.forEach((q, i) => sums.set(q.trait, (sums.get(q.trait) ?? 0) + answers[i]));
  const per = test.questions.filter((q) => q.trait === "1").length || 1;
  const traits: TraitScore[] = ENNEAGRAM_ORDER.map((k) => ({ key: k, label: `${k}번 유형`, score: Math.round((((sums.get(k) ?? per * 3) / per) - 1) / 4 * 100) }));
  const ranked = [...traits].sort((a, b) => b.score - a.score || ENNEAGRAM_ORDER.indexOf(a.key) - ENNEAGRAM_ORDER.indexOf(b.key));
  return {
    testId: test.id, kind: "enneagram", headline: `${ranked[0].key}번 유형`, code: ranked[0].key, traits,
    ranking: ranked.slice(0, 3).map((t) => t.key), close: ranked[0].score - ranked[1].score <= 6,
  };
}

/** 검사 종류에 맞춰 점수를 계산한다(답변은 validateAnswers를 통과한 값) */
export function scoreTest(test: Test, answers: number[]): ScoredResult {
  switch (test.kind) {
    case "type16": return scoreType16(test, answers);
    case "bigfive": return scoreBigFive(test, answers);
    case "behavior": return scoreBehavior(test, answers);
    case "attachment": return scoreAttachment(test, answers);
    case "enneagram": return scoreEnneagram(test, answers);
  }
}
