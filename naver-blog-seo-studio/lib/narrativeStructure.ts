// D-2 (2026-10-24, 도톨이 v1.3 「전개 구조」 기능 참고 — 이름·설명·지시문은 새로 씀): 글을 풀어 가는 순서 8가지 + 기본.
// 고정 소제목을 정하지 않고 순서만 지시한다. 「기본」이면 지시문이 v2.16과 같다. 실행 시점 import 없음(화면·서버·시험 공용).
export type NarrativeStructure = "default" | "answer-first" | "problem-solving" | "scene-opening" | "choice-criteria" | "step-by-step" | "question-chain" | "fact-expand" | "my-view";

export const NARRATIVE_STRUCTURES: { key: NarrativeStructure; label: string; hint: string; order: string }[] = [
  { key: "default", label: "기본 (지금처럼)", hint: "글쓰기 전략에 맞춰 AI가 순서를 정합니다.", order: "" },
  { key: "answer-first", label: "답 먼저", hint: "결론을 먼저 말하고 이유·근거·예외 순으로 풉니다.", order: "결론을 가장 먼저 분명히 말하고, 이어서 그렇게 판단한 이유 → 뒷받침하는 근거 → 예외나 주의할 경우 순서로 풉니다." },
  { key: "problem-solving", label: "막힌 문제 해결", hint: "독자가 막힌 상황 → 원인 → 해결 → 다시 막히지 않는 법.", order: "독자가 흔히 막히는 상황을 먼저 짚고, 왜 막히는지(원인) → 해결 방법 → 같은 문제가 다시 생기지 않게 하는 점검 순서로 풉니다." },
  { key: "scene-opening", label: "장면에서 시작", hint: "짧은 장면으로 열고 바로 핵심으로 들어갑니다.", order: "첫 문단의 맨 앞을 독자가 겪을 법한 짧은 장면 1~2문장으로 열고 곧바로 핵심 답을 요약합니다. 장면은 일반적인 상황 묘사로만 쓰고 실제 있었던 일처럼 꾸미지 않습니다. 이후 소제목은 그 장면에서 생기는 궁금증을 하나씩 푸는 순서로 둡니다." },
  { key: "choice-criteria", label: "고르는 기준", hint: "선택지 → 판단 기준 → 상황별 추천.", order: "고를 수 있는 선택지를 먼저 보여 주고, 무엇을 기준으로 판단하는지 → 기준별 비교 → 독자 상황별 추천 순서로 풉니다." },
  { key: "step-by-step", label: "단계별 따라하기", hint: "준비 → 1단계부터 차례대로 → 마무리 점검.", order: "준비할 것을 먼저 정리하고, 실제로 하는 순서대로 단계를 나눠 소제목마다 한 단계씩 설명한 뒤, 마지막에 끝났는지 확인하는 점검으로 마무리합니다." },
  { key: "question-chain", label: "질문 이어가기", hint: "독자가 다음에 물을 질문을 차례로 답합니다.", order: "소제목을 독자가 차례로 떠올릴 질문으로 두고, 앞 질문의 답이 다음 질문으로 자연스럽게 이어지게 풉니다." },
  { key: "fact-expand", label: "사실 하나에서 넓히기", hint: "핵심 사실 하나 → 의미 → 적용 → 한계.", order: "가장 중요한 사실 하나를 먼저 분명히 하고, 그 사실이 독자에게 어떤 의미인지 → 실제로 어떻게 적용하는지 → 한계나 확인할 점 순서로 넓혀 갑니다. 그 사실은 근거가 있는 내용만 씁니다." },
  { key: "my-view", label: "내 관점과 이유", hint: "관점 제시 → 이유 → 반대 의견 → 정리.", order: "글쓴이의 관점을 먼저 한 문장으로 밝히고, 그 이유 → 다르게 볼 수 있는 의견과 그에 대한 생각 → 독자가 판단할 수 있게 정리하는 순서로 풉니다. 관점은 의견으로 표현하고 사실처럼 단정하지 않습니다." },
];

/** 요청 값 검사: 모르는 값·빈 값은 「기본」(예전과 같은 동작). */
export function readNarrativeStructure(value: unknown): NarrativeStructure {
  return NARRATIVE_STRUCTURES.some((x) => x.key === value) ? value as NarrativeStructure : "default";
}

/** 한 번에 쓰기 시스템 지시문 끝에 붙는 규칙. 기본이면 빈 문자열. */
export function structureRule(value: unknown): string {
  const item = NARRATIVE_STRUCTURES.find((x) => x.key === readNarrativeStructure(value));
  if (!item?.order) return "";
  return `\n글 전개 구조(${item.label}): 글쓰기 전략의 방향과 위 규칙(첫 문단 요약·소제목 수·분량)은 그대로 지키고, 글을 풀어 가는 순서만 이렇게 맞춥니다. ${item.order}`;
}

/** 구간별 쓰기 목차 지시문에 붙는 한 줄. 기본이면 빈 문자열. */
export function structureOutlineLine(value: unknown): string {
  const item = NARRATIVE_STRUCTURES.find((x) => x.key === readNarrativeStructure(value));
  if (!item?.order) return "";
  return `\n- 전개 구조(${item.label}): 도입부와 소제목의 순서를 이렇게 잡습니다. ${item.order}`;
}
