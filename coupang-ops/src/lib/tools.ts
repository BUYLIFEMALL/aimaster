// 좌측 메뉴·홈 카드가 함께 쓰는 화면 목록(번호 = 실제 사용 순서). 기능을 출시할 때마다 한 줄씩 추가한다.
export interface ToolItem {
  href: string;
  emoji: string;
  label: string;
  short: string;
  description: string;
  group: string;
}

/** 좌측 메뉴 묶음(WING 메뉴 구성을 따름). 「API키등록·플랫폼연동」은 Sidebar에서 매뉴얼 바로 위로 보낸다 */
export const MENU_GROUPS: { title: string; emoji: string }[] = [
  { title: "상품관리", emoji: "📦" },
  { title: "주문/배송", emoji: "🚚" },
  { title: "문의", emoji: "💬" },
  { title: "정산", emoji: "📊" },
  { title: "프로모션", emoji: "🎟" },
  { title: "판매자정보", emoji: "⚙" },
];

export const TOOLS: ToolItem[] = [
  { href: "/connect", emoji: "🔑", label: "🔑 API키등록·플랫폼연동", short: "쿠팡·AI 키 등록", description: "WING에서 발급받은 업체코드·Access Key·Secret Key·WING ID를 한 번 등록합니다.", group: "판매자정보" },
  { href: "/defaults", emoji: "⚙", label: "배송·반품 기본값", short: "출고지·반품지·배송비", description: "출고지·반품지·택배사·배송비를 한 번 넣어 두면 모든 상품에 함께 쓰입니다.", group: "판매자정보" },
  { href: "/alerts", emoji: "🔔", label: "아침 요약 알림", short: "텔레그램·이메일·카카오톡", description: "매일 정한 시각에 출고중지·미답변 문의 등 처리할 건수를 텔레그램·이메일·카카오톡으로 받습니다.", group: "판매자정보" },
  { href: "/products", emoji: "📦", label: "상품 등록", short: "상세페이지 상품 → 쿠팡", description: "상세페이지 상품을 골라 카테고리 추천·옵션·검사까지 한 화면에서 준비합니다.", group: "상품관리" },
  { href: "/my-products", emoji: "🗂", label: "내 쿠팡 상품", short: "목록·옵션·상품 수정", description: "쿠팡에 등록된 내 상품을 불러와 승인 상태를 보고, 옵션과 상품 정보를 고칩니다.", group: "상품관리" },
  { href: "/stock", emoji: "📉", label: "품절 예방", short: "재고 점검·채우기", description: "승인된 상품의 옵션 재고를 20개씩 점검해 품절·부족 옵션을 모아 보고 재고를 채웁니다.", group: "상품관리" },
  { href: "/bulk", emoji: "🧮", label: "일괄 가격·재고", short: "여러 옵션 한 번에", description: "옵션을 골라 가격을 %·금액으로, 재고를 수량으로 한 번에 바꿉니다. 미리 보고 확인한 뒤 적용합니다.", group: "상품관리" },
  { href: "/orders", emoji: "🚚", label: "주문(발주서)", short: "발주서 조회", description: "쿠팡에 들어온 주문을 상태·기간별로 불러와 수량·수취인·배송 정보를 확인합니다.", group: "주문/배송" },
  { href: "/returns", emoji: "↩", label: "출고중지·취소", short: "출고중지 요청 처리", description: "고객의 출고중지 요청·반품 접수를 확인하고 출고중지 완료 또는 이미출고로 처리합니다.", group: "주문/배송" },
  { href: "/exchanges", emoji: "🔄", label: "교환", short: "입고 확인·교환 송장", description: "교환 요청을 확인하고 입고 확인, 교환 송장 등록, 거부를 처리합니다.", group: "주문/배송" },
  { href: "/inquiries", emoji: "💬", label: "고객 문의", short: "문의·AI 답변 초안", description: "상품 문의와 고객센터 이관 문의를 모아 보고, AI 초안을 확인해 답변합니다.", group: "문의" },
  { href: "/revenue", emoji: "📊", label: "매출·정산", short: "실제 수수료·순이익", description: "쿠팡 실제 정산 값으로 옵션별 수수료와 순이익을 계산하고 지급 내역을 확인합니다.", group: "정산" },
  { href: "/coupons", emoji: "🎟", label: "쿠폰", short: "즉시할인·다운로드", description: "쿠폰 계약과 예산을 확인하고 즉시할인·다운로드 쿠폰을 만들어 옵션에 적용합니다.", group: "프로모션" },
];

