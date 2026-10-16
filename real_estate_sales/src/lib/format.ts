// 화면 공통 표기 — 한국 시간 고정, 금액은 억 단위
const TZ = "Asia/Seoul";

export function formatDateTime(value: string): string {
  const dt = new Date(value);
  return `${dt.toLocaleDateString("ko-KR", { timeZone: TZ })} ${dt.toLocaleTimeString("ko-KR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** 만원 단위 금액 → "12.5억" (실거래 price_amount 기준). 공시가격(원 단위)은 /10000 해서 넘긴다. */
export function formatWon(amountManwon: number | null | undefined): string {
  if (!amountManwon) return "-";
  return `${(amountManwon / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`;
}

/** 거래가 ÷ 공시가격(%) — 둘 다 만원 단위로 맞춰 넣는다 */
export function priceToOfficialPct(priceManwon: number | null, officialWon: number | null): number | null {
  if (!priceManwon || !officialWon) return null;
  return Math.round((priceManwon / (officialWon / 10000)) * 100);
}
