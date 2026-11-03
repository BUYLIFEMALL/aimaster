// 화면 표시용(만 원 → 「4억」「5,000만」, 날짜는 한국 시각)
export const won = (v: number | null) => (v === null ? "" : v >= 10000 ? `${(v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억` : `${v.toLocaleString("ko-KR")}만`);
export const day = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
export const priceText = (l: { deal_type: string; price: number; monthly: number | null }) =>
  l.deal_type === "월세" ? `보증금 ${won(l.price)} / 월 ${won(l.monthly ?? 0)}` : `${l.deal_type} ${won(l.price)}`;
