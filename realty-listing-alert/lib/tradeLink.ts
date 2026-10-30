// 2026-10-30: 감시 대상 → 「부동산 실거래 투자분석」 실거래 목록 바로가기(서울·경기·인천).
// 지역 감시는 네이버 지역 코드(10자리) 앞 5자리 = 시·군·구 코드로, 단지 감시는 단지 이름으로 거른다(실거래 쪽 /listings?district=&q=).
// 실거래 프로그램 코드는 부르지 않고 주소만 연다(각자 독립 배포).
export const TRADE_LIST_URL = "https://real-estate-sales.buylife.xyz/listings";

export function buildTradeListLink(t: { target_type: string; cortar_no: string | null; complex_name: string | null }) {
  const params = new URLSearchParams();
  if (t.target_type === "region") {
    const sgg = String(t.cortar_no ?? "").slice(0, 5);
    if (!/^\d{5}$/.test(sgg)) return null;
    params.set("district", sgg);
  } else {
    const name = String(t.complex_name ?? "").replace(/\d{3,}[-\s]?\d{3,}[-\s]?\d{0,4}/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (name.length < 2) return null;
    params.set("q", name);
  }
  return `${TRADE_LIST_URL}?${params.toString()}`;
}
