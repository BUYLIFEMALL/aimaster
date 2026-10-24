// 감시 대상 공통 규칙(화면·서버 액션이 함께 씀). DB에도 같은 제한(10개 트리거·단지 번호 형식·거래 코드)이 있다.
export const MAX_TARGETS = 10;

// 0단계 사전 검증에서 확인: A1=매매, B1=전세. B2=월세는 3단계 첫 시험에서 확인.
export const TRADE_TYPES = [
  { code: "A1", label: "매매" },
  { code: "B1", label: "전세" },
  { code: "B2", label: "월세" },
] as const;
export type TradeCode = (typeof TRADE_TYPES)[number]["code"];

/** 「new.land.naver.com/complexes/10981?…」 주소나 숫자만 넣어도 단지 번호를 뽑는다. 그 밖의 주소는 거절. */
export function parseComplexNo(input: string): string | null {
  const text = input.trim();
  if (/^\d{1,12}$/.test(text)) return text;
  const m = text.match(/^(?:https?:\/\/)?(?:new|fin|m)\.land\.naver\.com\/complexes\/(\d{1,12})(?:[/?#].*)?$/i);
  return m ? m[1] : null;
}

/** 빈 칸이면 null, 숫자가 아니거나 음수면 undefined(오류). */
export function optionalNumber(value: FormDataEntryValue | null): number | null | undefined {
  const text = String(value ?? "").trim().replace(/,/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
