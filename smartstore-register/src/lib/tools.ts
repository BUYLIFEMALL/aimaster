// 좌측 메뉴·홈 카드가 함께 쓰는 화면 목록(번호 = 실제 사용 순서).
export interface ToolItem {
  href: string;
  emoji: string;
  label: string;
  short: string;
  description: string;
}

export const TOOLS: ToolItem[] = [
  { href: "/defaults", emoji: "⚙", label: "스토어 기본값", short: "원산지·A/S·템플릿", description: "원산지·A/S 전화·배송/반품 템플릿 이름처럼 상품마다 같은 값을 한 번만 넣어 둡니다." },
  { href: "/products", emoji: "📦", label: "등록할 상품", short: "상세페이지에서 불러오기", description: "AI 상세페이지 자동화에서 만든 내 상품을 불러와, 스마트스토어 칸에 들어갈 값을 확인합니다." },
  { href: "/history", emoji: "🧾", label: "등록 기록", short: "입력 완료·등록·실패 이유", description: "확장 프로그램이 보낸 결과(입력 완료·상품번호·실패한 칸)를 모아 봅니다. 30일 뒤 자동 정리." },
];
