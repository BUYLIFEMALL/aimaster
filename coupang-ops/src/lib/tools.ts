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
];

/** 출시 순서(docs/IMPROVEMENT_BACKLOG.md 단계). 대시보드 「기능 출시 순서」에 보여 준다. */
export const ROADMAP: { stage: string; emoji: string; title: string; items: string }[] = [
  { stage: "1단계", emoji: "📦", title: "쿠팡 연결 + 상품 등록", items: "키 등록·연결 시험, 출고지·반품지, 카테고리 추천, 옵션·이미지, 저장/승인 요청" },
  { stage: "2단계", emoji: "🗂", title: "상품 관리", items: "내 상품 목록, 가격·재고 변경, 판매 중지·재개, 연속 등록" },
  { stage: "3단계", emoji: "🚚", title: "주문·송장", items: "발주서 조회, 상품준비중, 송장 등록, 취소 처리" },
  { stage: "4단계", emoji: "💬", title: "반품·교환·문의", items: "반품·교환 처리, 문의 조회, AI 답변 초안" },
  { stage: "5단계", emoji: "📊", title: "정산·마케팅", items: "정산 리포트, 쿠폰, 로켓그로스" },
];
