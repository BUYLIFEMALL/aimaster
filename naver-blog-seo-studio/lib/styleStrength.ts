// D-1 (2026-10-24, 도톨이 v1.3 기능 참고 — 지시문은 새로 씀): 내 문체를 얼마나 세게 반영할지 3단계.
// 「균형」은 v2.16까지의 문체 지시문과 글자까지 같다. 실행 시점 import 없음(화면·서버·시험 공용).
export type StyleStrength = "subtle" | "balanced" | "strong";

export const STYLE_STRENGTHS: { key: StyleStrength; label: string; hint: string }[] = [
  { key: "subtle", label: "은은하게", hint: "어조와 쓰지 않는 표현만 지키고, 자주 쓰는 표현은 일부러 넣지 않습니다." },
  { key: "balanced", label: "균형 (기본)", hint: "지금까지와 같은 세기로 말투·문장·구성 습관을 따릅니다." },
  { key: "strong", label: "뚜렷하게", hint: "자주 쓰는 표현·문장 리듬·독자에게 말 거는 방식을 적극적으로 살립니다." },
];

/** 요청 값 검사: 모르는 값·빈 값은 「균형」(예전과 같은 동작). */
export function readStyleStrength(value: unknown): StyleStrength {
  return value === "subtle" || value === "strong" ? value : "balanced";
}
