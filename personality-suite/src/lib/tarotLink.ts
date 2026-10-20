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

// v1.26: 16유형 결과 → 캐릭코드(mbti-character)의 같은 유형 캐릭터 결과로 이어 가기(유형 코드만 전달).
export const CHARACTER_RESULT_URL = "https://mbti-character.buylife.xyz/result";

// 캐릭코드의 「나의 성향 지표」가 실제 값으로 나오도록 축별 우세 비율(50~100, 캐릭코드와 같은 형식)을 함께 보낸다.
// 16유형 지표만 보내며 마음 상태 같은 민감한 검사 점수는 보내지 않는다. from이 있으면 캐릭코드는 이미지 자동 생성을 하지 않는다.
export function characterLink(result: ScoredResult): string | null {
  if (result.kind !== "type16" || !/^[EI][SN][TF][JP]$/.test(result.code)) return null;
  const p = new URLSearchParams();
  for (const a of result.axes ?? []) p.set(a.axis, String(Math.max(a.firstPct, 100 - a.firstPct)));
  p.set("from", "personality-suite");
  return `${CHARACTER_RESULT_URL}/${result.code}?${p.toString()}`;
}

// v1.27: 16유형 결과 → 성격코드(personality-code)의 같은 유형 해설로 이어 가기(캐릭코드와 같은 주소 형식).
export const PERSONALITY_CODE_RESULT_URL = "https://personality-code.buylife.xyz/result";

export function personalityCodeLink(result: ScoredResult): string | null {
  const c = characterLink(result);
  return c ? c.replace(CHARACTER_RESULT_URL, PERSONALITY_CODE_RESULT_URL) : null;
}
