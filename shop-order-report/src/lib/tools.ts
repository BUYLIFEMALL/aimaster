// 좌측 메뉴·홈 카드가 함께 쓰는 화면 목록(번호 = 실제 사용 순서).
export interface ToolItem {
  href: string;
  emoji: string;
  label: string;
  short: string;
  description: string;
}

export const TOOLS: ToolItem[] = [
  { href: "/upload", emoji: "📥", label: "주문 파일 올리기", short: "마켓 엑셀·CSV · 자동 인식", description: "판매자센터에서 받은 주문 엑셀을 올리면 마켓과 열을 알아보고, 개인정보 열은 버린 뒤 주문만 이 PC에 모읍니다." },
  { href: "/orders", emoji: "📦", label: "주문 현황", short: "신규·배송·취소·반품", description: "주문 상태별 건수와 목록을 마켓 구분 없이 한 화면에서 봅니다." },
  { href: "/report", emoji: "💰", label: "매출·순이익 리포트", short: "일·주·월·상품·마켓", description: "기간별·상품별·마켓별 매출과 정산액, 원가를 뺀 순이익을 그래프와 표로 보고 엑셀로 받습니다." },
  { href: "/inventory", emoji: "📉", label: "재고 소진 예측", short: "최근 14일 판매 속도", description: "현재 재고를 넣으면 최근 판매 속도로 며칠 뒤 품절될지 알려 줍니다." },
  { href: "/reviews", emoji: "⭐", label: "리뷰 분석", short: "별점·자주 나온 말·불만", description: "내 상품 리뷰 파일로 별점 분포와 자주 나온 말, 불만 리뷰를 모읍니다. AI 요약은 선택입니다." },
  { href: "/settings", emoji: "⚙", label: "원가·수수료 설정", short: "상품별 원가 · 광고비", description: "상품별 원가·포장비, 마켓 수수료율, 택배비·광고비를 넣어 순이익을 맞춥니다." },
];
