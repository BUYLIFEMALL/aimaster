// 성격·운세 4개 프로그램 「이어서 보기」 링크 — 공용 기준 코드 `personality-program-links`(2026-10-20, 기준 personality-suite,
// 사본 mbti·mbti-character·tarot). 사본은 직접 고치지 않는다 — 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`.
// 주소에는 유형 코드·지표 비율(0~100)·질문 문장만 담는다(민감한 검사 점수는 보내지 않음). 받는 쪽은 from이 있으면
// 그림 생성·카드 해석 같은 유료 동작을 자동으로 하지 않고, 회원이 직접 눌러야 시작한다.

export const TAROT_DRAW_URL = "https://tarot-reading.buylife.xyz/draw";
export const CHARACTER_RESULT_URL = "https://mbti-character.buylife.xyz/result";
export const PERSONALITY_CODE_RESULT_URL = "https://personality-code.buylife.xyz/result";

/** 넘어온 프로그램 slug → 화면에 보여 줄 이름(타로점 「○○에서 넘어왔어요」 안내) */
export const FROM_LABELS: Record<string, string> = {
  "personality-suite": "AI 종합 성격 진단",
  "mbti-character": "캐릭코드",
  "personality-code": "성격코드",
};

/** 타로점 3장 리딩으로 — 질문만 미리 채운다(300자까지, 타로점 입력 한도와 같음) */
export function tarotDrawLink(question: string, from: string): string {
  const p = new URLSearchParams({ q: question.slice(0, 300), spread: "three_cards", from });
  return `${TAROT_DRAW_URL}?${p.toString()}`;
}

/**
 * 같은 16유형 결과 화면으로(캐릭코드·성격코드 공통 주소 형식 `/result/ENFP?EI=60&…&from=`).
 * strengths: 지표 이름(EI·SN·TF·JP 등) → 우세 비율. 숫자가 아니면 빼고, 0~100 정수로 맞춘다.
 */
export function typeResultLink(baseUrl: string, code: string, strengths: Record<string, number | string | undefined>, from: string): string {
  const p = new URLSearchParams();
  for (const [dim, raw] of Object.entries(strengths)) {
    const v = Number(raw);
    if (raw !== undefined && raw !== "" && Number.isFinite(v)) p.set(dim, String(Math.max(0, Math.min(100, Math.round(v)))));
  }
  p.set("from", from);
  return `${baseUrl}/${code}?${p.toString()}`;
}
