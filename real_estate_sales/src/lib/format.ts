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

/** 거래 종류에 맞춘 금액 표기: 매매 「3.2억」, 전세 「전세 3.2억」, 월세 「5,000만/80만」 */
export function formatDealPrice(deal: string | null | undefined, price: number | null | undefined, rent: number | null | undefined): string {
  if (deal === "전세") return `전세 ${formatWon(price)}`;
  if (deal === "월세") return `월세 ${formatWon(price)}/${(rent ?? 0).toLocaleString("ko-KR")}만`;
  return formatWon(price);
}

/** 거래가 ÷ 공시가격(%) — 둘 다 만원 단위로 맞춰 넣는다 */
export function priceToOfficialPct(priceManwon: number | null, officialWon: number | null): number | null {
  if (!priceManwon || !officialWon) return null;
  return Math.round((priceManwon / (officialWon / 10000)) * 100);
}

/** 공시가 대비가 이 범위를 벗어나면 특수 거래(지분·재개발 기대·신고 오류 등)일 수 있어 안내한다 */
export function isUnusualPriceRatio(pct: number | null): boolean {
  return pct !== null && (pct < 100 || pct > 400);
}
