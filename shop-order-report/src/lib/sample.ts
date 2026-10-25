// 「예시 주문 파일」 — 화면 사용법을 익히는 용도(파일 이름·내용에 「예시」 표시). 실제 리포트 숫자로 섞이지 않게
// 회원이 직접 받아 올릴 때만 쓰인다. 시험에서도 같은 값이 나오도록 고정 난수를 쓴다.

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const PRODUCTS = [
  { name: "예시 유기농 사과즙 30포", option: "선물세트", price: 29900 },
  { name: "예시 제주 감귤 3kg", option: "가정용", price: 18900 },
  { name: "예시 수제 그래놀라 500g", option: "", price: 12800 },
];

/** 스마트스토어 모양 열 이름(개인정보 열 포함 — 앱이 이 열들을 버리는지 확인하는 용도, 값은 가짜) */
export const SMARTSTORE_HEADERS = ["상품주문번호", "주문번호", "주문일시", "주문상태", "상품명", "옵션정보", "수량", "최종 상품별 총 주문금액", "정산예정금액", "배송비 합계", "구매자명", "수취인명", "수취인연락처1", "배송지"];
export const COUPANG_HEADERS = ["주문번호", "묶음배송번호", "주문일", "주문상태", "등록상품명", "노출상품명", "등록옵션명", "구매수", "결제액", "수취인이름", "수취인전화번호", "수취인 주소"];

export function sampleOrders(market: "smartstore" | "coupang", days = 28, endDate = "2026-10-24", seed = 7): string[][] {
  const rnd = seeded(seed + (market === "coupang" ? 100 : 0));
  const rows: string[][] = [];
  const end = new Date(`${endDate}T00:00:00Z`);
  let n = 1;
  for (let d = days - 1; d >= 0; d -= 1) {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - d);
    const date = day.toISOString().slice(0, 10);
    const count = 1 + Math.floor(rnd() * 4);
    for (let i = 0; i < count; i += 1) {
      const p = PRODUCTS[Math.floor(rnd() * PRODUCTS.length)];
      const qty = 1 + Math.floor(rnd() * 2);
      const amount = p.price * qty;
      const r = rnd();
      const status = d > 5 ? (r < 0.05 ? "반품완료" : r < 0.1 ? "취소완료" : "구매확정") : d > 2 ? "배송중" : "결제완료";
      const orderNo = `${market === "coupang" ? "C" : "S"}${date.replace(/-/g, "")}${String(n).padStart(4, "0")}`;
      if (market === "smartstore") {
        rows.push([`${orderNo}01`, orderNo, `${date} 1${i}:2${i}:00`, status, p.name, p.option, String(qty), String(amount), String(Math.round(amount * 0.94)), "3000", "홍길동(예시)", "홍길동(예시)", "010-0000-0000", "예시시 예시구 예시로 1"]);
      } else {
        rows.push([orderNo, `B${orderNo}`, date, status === "구매확정" ? "배송완료" : status, p.name, p.name, p.option, String(qty), String(amount), "김예시", "010-0000-0000", "예시시 예시구 예시로 2"]);
      }
      n += 1;
    }
  }
  return rows;
}

export const SAMPLE_REVIEW_HEADERS = ["상품명", "별점", "리뷰내용"];
export const SAMPLE_REVIEWS: string[][] = [
  ["예시 유기농 사과즙 30포", "5", "맛있고 포장이 꼼꼼해서 선물하기 좋았어요"],
  ["예시 유기농 사과즙 30포", "4", "맛은 좋은데 배송이 조금 늦게 왔어요"],
  ["예시 제주 감귤 3kg", "2", "몇 개가 파손돼서 왔어요 포장 개선 부탁드려요"],
  ["예시 제주 감귤 3kg", "5", "새콤달콤 맛있어요 재구매 의사 있습니다"],
  ["예시 수제 그래놀라 500g", "3", "맛은 괜찮은데 생각보다 양이 작아요"],
  ["예시 수제 그래놀라 500g", "1", "봉지가 찢어져서 왔어요 실망입니다"],
];
