// 병합 B-3(작업실 → SEO 스튜디오, blog-workroom WriteView LENGTHS·prompts.ts 소제목 수/구간 분량): 글 분량 3단계.
// 「보통」은 v2.13까지의 고정값과 같다(한 번에 쓰기 소제목 4개·2,000~3,500자, 구간 5~6개·450~650자). 실행 시점 import 없음(화면·서버·시험 공용).
export type DraftLength = "short" | "normal" | "long";
export interface LengthPlan {
  label: string;
  headings: number;      // 한 번에 쓰기 소제목 수
  min: number; max: number; // 본문 목표(공백 제외)
  expandTo: number;      // min 미만이면 이 길이까지 보강
  outline: string;       // 구간별 쓰기 구성 수(도입 포함)
  intro: string;         // 도입 구간 분량
  section: string;       // 소제목 구간 분량
  paragraphs: string;    // 한 번에 쓰기: 소제목 아래 문단 규칙(규칙 3번)
  keepParagraphs: string; // 보강 때 유지할 문단 수
  expandAdd: string;     // 보강 때 소제목마다 더할 문단 수
}

export const LENGTH_PLANS: Record<DraftLength, LengthPlan> = {
  short: { label: "짧게(1,500자 내외)", headings: 3, min: 1_200, max: 1_800, expandTo: 1_500, outline: "4개", paragraphs: "2개 이상의 문단을 두고, 각 문단은 3~5문장으로", keepParagraphs: "2개 이상", expandAdd: "1~2개",
    intro: "공백 제외 200~300자, 2개 문단", section: "공백 제외 300~400자, 2개 이상 문단(문단마다 3~4문장, 문단마다 구체적인 예시나 판단 기준 하나)" },
  normal: { label: "보통(2,500자 내외)", headings: 4, min: 2_000, max: 3_500, expandTo: 2_300, outline: "5~6개", paragraphs: "2개 이상의 문단을 두고, 각 문단은 3~5문장으로", keepParagraphs: "2개 이상", expandAdd: "1~2개",
    intro: "공백 제외 300~450자, 2~3개 문단", section: "공백 제외 450~650자, 3개 이상 문단(문단마다 3~5문장, 문단마다 구체적인 예시나 판단 기준 하나)" },
  long: { label: "길게(4,000자 이상)", headings: 6, min: 3_800, max: 5_000, expandTo: 4_200, outline: "7~8개", paragraphs: "반드시 문단 4개를 두고(3개 이하 금지), 각 문단은 4~5문장으로", keepParagraphs: "4개", expandAdd: "2~3개",
    intro: "공백 제외 350~500자, 3개 문단", section: "공백 제외 600~800자, 4개 이상 문단(문단마다 3~5문장, 문단마다 구체적인 예시나 판단 기준 하나)" },
};
export const DRAFT_LENGTHS = Object.keys(LENGTH_PLANS) as DraftLength[];

/** 요청 값 검사: 모르는 값·빈 값은 「보통」(예전과 같은 동작). */
export function readDraftLength(value: unknown): DraftLength {
  return value === "short" || value === "long" ? value : "normal";
}
export const lengthPlan = (value: unknown): LengthPlan => LENGTH_PLANS[readDraftLength(value)];
const n = (v: number) => v.toLocaleString("en-US");
/** 한 번에 쓰기 규칙 2·3번에 넣는 문구. */
export function headingRule(plan: LengthPlan) { return `소제목은 ${plan.headings}개를 일반 문장으로 작성하고`; }
export function bodyRangeText(plan: LengthPlan) { return `${n(plan.min)}~${n(plan.max)}자`; }
export function expandTargetText(plan: LengthPlan) { return `${n(plan.expandTo)}자`; }
