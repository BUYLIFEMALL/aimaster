// 좌측 메뉴가 쓰는 화면 목록(번호 = 실제 사용 순서). 화면을 출시할 때마다 한 줄씩 추가한다.
// 2단계 연동(/connect)·3단계 상품 등록(/products, 검사까지) — docs/PLAN_20261111_ELEVENST_REGISTER.md.
export interface ToolItem {
  href: string;
  emoji: string;
  label: string;
  short: string;
  description: string;
  group: string;
}

/** 좌측 메뉴 묶음. 「API키등록·플랫폼연동」은 Sidebar에서 매뉴얼 바로 위로 보낸다 */
export const MENU_GROUPS: { title: string; emoji: string }[] = [
  { title: "상품등록", emoji: "📦" },
  { title: "판매자정보", emoji: "⚙" },
];

export const TOOLS: ToolItem[] = [
  { href: "/products", emoji: "📦", label: "📦 상품 등록", short: "상세페이지 상품 → 11번가", description: "상세페이지 상품을 골라 카테고리·가격·배송·고시를 채우고 검사합니다.", group: "상품등록" },
  { href: "/connect", emoji: "🔑", label: "🔑 API키등록·플랫폼연동", short: "11번가 키·연결 시험", description: "11번가 API 키를 한 번 등록하고 연결 시험으로 확인합니다.", group: "판매자정보" },
];
