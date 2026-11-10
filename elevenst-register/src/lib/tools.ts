// 좌측 메뉴가 쓰는 화면 목록(번호 = 실제 사용 순서). 화면을 출시할 때마다 한 줄씩 추가한다.
// 1단계(v1.01)는 대시보드·매뉴얼만 — 연동(2단계)·상품 등록(3단계)은 만들 때 추가한다(docs/PLAN_20261111_ELEVENST_REGISTER.md).
export interface ToolItem {
  href: string;
  emoji: string;
  label: string;
  short: string;
  description: string;
  group: string;
}

/** 좌측 메뉴 묶음. 「API키등록·플랫폼연동」은 Sidebar에서 매뉴얼 바로 위로 보낸다 */
export const MENU_GROUPS: { title: string; emoji: string }[] = [];

export const TOOLS: ToolItem[] = [];
