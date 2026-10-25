// 마켓 주문 파일의 열 이름 사전(순수 데이터·함수). 마켓·시기마다 열 이름이 바뀌므로 「별칭 목록」으로 찾고,
// 못 찾은 열은 화면의 「열 맞추기」로 회원이 고른다. 개인정보 열(이름·주소·전화 등)은 읽지 않는다.

export type MarketId = "smartstore" | "coupang" | "11st" | "gmarket" | "auction" | "other";

export const MARKETS: { id: MarketId; label: string; color: string }[] = [
  { id: "smartstore", label: "스마트스토어", color: "#03c75a" },
  { id: "coupang", label: "쿠팡", color: "#e3342f" },
  { id: "11st", label: "11번가", color: "#ff5a2e" },
  { id: "gmarket", label: "G마켓", color: "#2f9e44" },
  { id: "auction", label: "옥션", color: "#d6336c" },
  { id: "other", label: "기타", color: "#64748b" },
];

export const marketLabel = (id: MarketId) => MARKETS.find((m) => m.id === id)?.label ?? "기타";

/** 리포트에 쓰는 칸. 개인정보 칸은 없다. */
export type FieldId = "orderNo" | "lineNo" | "orderedAt" | "product" | "option" | "qty" | "amount" | "settlement" | "shippingFee" | "status";

export const FIELDS: { id: FieldId; label: string; required: boolean; aliases: string[] }[] = [
  { id: "orderNo", label: "주문번호", required: true, aliases: ["주문번호", "주문 번호", "orderid", "order no", "주문id"] },
  { id: "lineNo", label: "상품주문번호", required: false, aliases: ["상품주문번호", "상품 주문번호", "주문상세번호", "주문순번"] },
  { id: "orderedAt", label: "주문일시", required: true, aliases: ["주문일시", "주문일", "결제일", "결제일시", "주문일자", "구매일", "주문시간"] },
  { id: "product", label: "상품명", required: true, aliases: ["상품명", "등록상품명", "노출상품명", "상품이름", "품명"] },
  { id: "option", label: "옵션", required: false, aliases: ["옵션정보", "옵션명", "옵션", "등록옵션명", "선택옵션"] },
  { id: "qty", label: "수량", required: true, aliases: ["수량", "구매수량", "주문수량", "판매수량", "구매수"] },
  { id: "amount", label: "판매금액", required: true, aliases: ["최종 상품별 총 주문금액", "총주문금액", "결제금액", "판매금액", "결제액", "상품별 총 주문금액", "판매가", "주문금액", "결제가격"] },
  { id: "settlement", label: "정산예정금액", required: false, aliases: ["정산예정금액", "정산금액", "정산 예정 금액", "판매자정산금액", "예상정산금액"] },
  { id: "shippingFee", label: "배송비", required: false, aliases: ["배송비 합계", "배송비", "주문배송비", "배송비금액"] },
  { id: "status", label: "주문상태", required: false, aliases: ["주문상태", "상태", "처리상태", "주문 상태", "배송상태", "클레임상태"] },
];

/** 개인정보로 보고 절대 읽지 않는 열(이 글자가 들어가면 제외). */
export const PERSONAL_HINTS = ["수취인", "구매자", "주문자", "받는", "주소", "배송지", "연락처", "전화", "휴대폰", "핸드폰", "우편", "이메일", "아이디", "배송메세지", "배송메시지", "개인통관", "통관부호"];

export function isPersonalColumn(header: string): boolean {
  const h = header.replace(/\s/g, "");
  return PERSONAL_HINTS.some((p) => h.includes(p));
}

const norm = (s: string) => s.replace(/[\s_()\[\]]/g, "").toLowerCase();

/** 열 이름 목록으로 칸 → 열 이름 대응을 추측한다(개인정보 열은 고르지 않음). */
export function guessMapping(headers: string[]): Partial<Record<FieldId, string>> {
  const usable = headers.filter((h) => !isPersonalColumn(h));
  const map: Partial<Record<FieldId, string>> = {};
  for (const f of FIELDS) {
    // 별칭 순서가 우선순위 — 정확히 같은 이름 → 포함하는 이름
    for (const alias of f.aliases) {
      const a = norm(alias);
      const exact = usable.find((h) => norm(h) === a && !Object.values(map).includes(h));
      if (exact) {
        map[f.id] = exact;
        break;
      }
    }
    if (map[f.id]) continue;
    for (const alias of f.aliases) {
      const a = norm(alias);
      const part = usable.find((h) => norm(h).includes(a) && !Object.values(map).includes(h));
      if (part) {
        map[f.id] = part;
        break;
      }
    }
  }
  return map;
}

/** 열 이름·파일 이름으로 마켓을 추측한다. 확실하지 않으면 other. */
export function guessMarket(headers: string[], fileName = ""): MarketId {
  const n = fileName.toLowerCase();
  const hs = headers.map(norm).join("|");
  if (/스마트스토어|smartstore|naver|네이버/.test(n) || hs.includes("상품주문번호") && hs.includes("최종상품별총주문금액")) return "smartstore";
  if (/쿠팡|coupang|wing/.test(n) || hs.includes("등록상품명") && hs.includes("노출상품명")) return "coupang";
  if (/11번가|11st|11st/.test(n) || hs.includes("주문순번")) return "11st";
  if (/지마켓|g마켓|gmarket/.test(n)) return "gmarket";
  if (/옥션|auction/.test(n)) return "auction";
  return "other";
}

export function missingRequired(map: Partial<Record<FieldId, string>>): string[] {
  return FIELDS.filter((f) => f.required && !map[f.id]).map((f) => f.label);
}
