// BLC-08a (2026-10-22): 「자료부터 집필」 프롬프트 조각 — 순수 함수(시험에서 바로 import).
// 근거가 없을 때 factRule은 v1.83까지의 7번 규칙 문장을 한 글자도 바꾸지 않고 돌려준다(기존 회원 결과 불변).
import type { ResearchSource } from "../grounding";

export interface DraftGrounding { keyword: string; angle?: string; points: { text: string; source: number; quote: string; title: string; link: string }[] }

export function factRule(explicitYears: string[], grounded: boolean): string {
  const years = explicitYears.join(", ") || "없음";
  if (!grounded) return `7. 실시간 검색·뉴스·공식 자료가 제공되지 않았으므로 최신 수치, 정책, 순위, 연도별 사실을 지어내지 마세요. 사용자가 직접 제시한 연도(${years}) 외의 연도는 제목과 본문에 쓰지 마세요. 최신성 검증이 필요한 내용은 [확인 필요]로 표시합니다.`;
  return `7. 사용자가 승인한 근거 목록이 함께 제공됩니다. 사실·수치·정책·순위는 이 근거에 있는 내용만 사용하고, 근거 문장을 그대로 베끼지 말고 자기 말로 풀어 씁니다. 근거에 없는 최신 수치나 사실은 지어내지 말고 [확인 필요]로 표시합니다. 사용자가 직접 제시한 연도(${years})와 근거에 나온 연도 외의 연도는 쓰지 마세요.`;
}

export function groundingSection(grounding: DraftGrounding | undefined): string {
  if (!grounding?.points.length) return "";
  const list = grounding.points.map((p, i) => `${i + 1}. ${p.text} (출처: ${p.title || `자료 ${p.source}`})`).join("\n");
  return `\n\n사용자가 승인한 근거(사실·수치는 이 목록에 있는 것만 사용, 문장 그대로 복사 금지):\n${list}${grounding.angle ? `\n\n글의 방향(참고): ${grounding.angle}` : ""}`;
}

/** 자료에서 근거 후보를 뽑는 지시문. 출처 번호는 수집한 자료 번호(n)를 그대로 쓴다. */
export function researchPrompt(keyword: string, sources: ResearchSource[], today: string): { system: string; user: string } {
  const list = sources.map((s) => `[자료 ${s.n}] (${s.kind === "news" ? "뉴스" : s.kind === "memo" ? "내 메모" : "블로그/웹"}) ${s.title}\n${s.text.slice(0, 3500)}`).join("\n\n");
  return {
    system: `당신은 한국어 블로그 자료 조사 담당자입니다. 오늘은 한국 기준 ${today}입니다. 제공된 자료 밖의 사실을 만들지 않고 JSON만 반환합니다.`,
    user: `검색어: ${keyword}\n아래는 이 검색어로 모은 자료입니다.\n\n${list}\n\n글을 쓰기 전에 독자에게 필요한 사실·정보를 정리하세요.\n- points: 12~20개. 각 항목은 자료 내용을 내 말로 다시 쓴 한 문장(text), 근거가 된 자료 번호(source, [자료 n]의 n), 그 자료 속 짧은 근거 구절(quote, 30자 이내, 원문 그대로 복사)입니다. 자료에 없는 내용은 넣지 마세요.\n- angle: 위 자료들과 다르게 쓸 수 있는 내 글만의 방향 2~3문장.\nJSON: {"points":[{"text":"","source":1,"quote":""}],"angle":""}`,
  };
}
