// 좌측 메뉴·홈 카드가 함께 쓰는 화면 목록(번호 = 실제 사용 순서). 기능을 출시할 때마다 한 줄씩 추가한다.
export interface ToolItem {
  href: string;
  emoji: string;
  label: string;
  short: string;
  description: string;
}

export const TOOLS: ToolItem[] = [
  { href: "/connect", emoji: "🔑", label: "쿠팡 연결", short: "Open API 키 등록", description: "WING에서 발급받은 업체코드·Access Key·Secret Key·WING ID를 한 번 등록합니다." },
  { href: "/defaults", emoji: "⚙", label: "배송·반품 기본값", short: "출고지·반품지·배송비", description: "출고지·반품지·택배사·배송비를 한 번 넣어 두면 모든 상품에 함께 쓰입니다." },
  { href: "/products", emoji: "📦", label: "상품 등록", short: "상세페이지 상품 → 쿠팡", description: "상세페이지 상품을 골라 카테고리 추천·옵션·검사까지 한 화면에서 준비합니다." },
  { href: "/my-products", emoji: "🗂", label: "내 쿠팡 상품", short: "WING 상품 목록", description: "쿠팡에 등록된 내 상품을 상태·상품명으로 불러와 승인 상태를 한눈에 봅니다." },
  { href: "/stock", emoji: "📉", label: "품절 예방", short: "재고 점검·채우기", description: "승인된 상품의 옵션 재고를 20개씩 점검해 품절·부족 옵션을 모아 보고 재고를 채웁니다." },
  { href: "/orders", emoji: "🚚", label: "주문(발주서)", short: "발주서 조회", description: "쿠팡에 들어온 주문을 상태·기간별로 불러와 수량·수취인·배송 정보를 확인합니다." },
  { href: "/returns", emoji: "↩", label: "출고중지·취소", short: "출고중지 요청 처리", description: "고객의 출고중지 요청·반품 접수를 확인하고 출고중지 완료 또는 이미출고로 처리합니다." },
  { href: "/exchanges", emoji: "🔄", label: "교환", short: "입고 확인·교환 송장", description: "교환 요청을 확인하고 입고 확인, 교환 송장 등록, 거부를 처리합니다." },
  { href: "/inquiries", emoji: "💬", label: "고객 문의", short: "문의·AI 답변 초안", description: "상품 문의와 고객센터 이관 문의를 모아 보고, AI 초안을 확인해 답변합니다." },
  { href: "/revenue", emoji: "📊", label: "매출·정산", short: "실제 수수료·순이익", description: "쿠팡 실제 정산 값으로 옵션별 수수료와 순이익을 계산하고 지급 내역을 확인합니다." },
];

/** 출시 순서(docs/IMPROVEMENT_BACKLOG.md 단계). 대시보드 「기능 출시 순서」에 보여 준다. */
export const ROADMAP: { stage: string; emoji: string; title: string; items: string }[] = [
  { stage: "1단계", emoji: "📦", title: "쿠팡 연결 + 상품 등록", items: "키 등록·연결 시험, 출고지·반품지, 카테고리 추천, 옵션·이미지, 저장/승인 요청" },
  { stage: "2단계", emoji: "🗂", title: "상품 관리", items: "내 상품 목록, 가격·재고 변경, 판매 중지·재개, 연속 등록" },
  { stage: "3단계", emoji: "🚚", title: "주문·송장", items: "발주서 조회, 상품준비중, 송장 등록, 취소 처리" },
  { stage: "4단계", emoji: "💬", title: "반품·교환·문의", items: "반품·교환 처리, 문의 조회, AI 답변 초안" },
  { stage: "5단계", emoji: "📊", title: "정산·마케팅", items: "정산 리포트, 쿠폰, 로켓그로스" },
];
