import type { Report } from "./tests/report";
import type { ScoredResult } from "./tests/types";

// 검사 결과 → AIMaster 타로점 3장 리딩으로 이어 가기(v1.24).
// 주소에는 점수 숫자를 넣지 않고, 유형 이름이나 가장 부담이 큰 영역 이름만 담은 질문 문장만 보낸다.
// 타로점은 질문만 미리 채우고, 카드 뽑기·AI 해석은 회원이 직접 눌러야 시작된다(자동 과금 없음).
export const TAROT_DRAW_URL = "https://tarot-reading.buylife.xyz/draw";

export function tarotQuestion(result: ScoredResult, report: Report, wellbeing: boolean): string {
  if (wellbeing && result.traits?.length) {
    const top = [...result.traits].sort((a, b) => b.score - a.score)[0];
    return `요즘 '${top.label}' 부분이 마음에 걸립니다. 마음의 균형을 되찾으려면 어떤 흐름과 조언이 필요할까요?`;
  }
  if (result.axes?.length && report.title) {
    return `${report.title} 성향의 나에게 지금 필요한 흐름과 조언은 무엇일까요?`;
  }
  if (result.traits?.length) {
    const top = [...result.traits].sort((a, b) => b.score - a.score)[0];
    return `'${top.label}' 성향이 강한 나에게 지금 필요한 흐름과 조언은 무엇일까요?`;
  }
  return "지금의 나에게 필요한 흐름과 조언은 무엇일까요?";
}

export function tarotLink(question: string): string {
  const p = new URLSearchParams({ q: question.slice(0, 300), spread: "three_cards", from: "personality-suite" });
  return `${TAROT_DRAW_URL}?${p.toString()}`;
}
