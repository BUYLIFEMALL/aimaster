// 직원 부계정(D22) — 메뉴 묶음 권한. DB(0043)는 돈·비밀값·사람이 걸린 함수만 따로 막고, 화면은 이 표로 메뉴를 거른다
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export const PERM_GROUPS = [
  { key: "orders", label: "주문·견적" },
  { key: "products", label: "상품·재고·공동구매" },
  { key: "customers", label: "손님·쿠폰·포인트" },
  { key: "boards", label: "게시판(후기·문의·FAQ·공지)" },
  { key: "home", label: "첫 화면·사진" },
  { key: "stats", label: "통계" },
] as const;

export type PermKey = (typeof PERM_GROUPS)[number]["key"];
export type Perms = Record<PermKey, boolean>;
export type MyStaff = { role: "owner" | "manager" | "staff"; perms: Partial<Perms> } | null;

/** 관리 메뉴 주소(admin 뒤) → 필요한 권한. ''(대시보드)는 누구나, 'owner'는 대표만 */
export const MENU_PERM: Record<string, PermKey | "owner" | "any"> = {
  "": "any",
  "/orders": "orders",
  "/quotes": "orders",
  "/recurring": "orders",
  "/customers": "customers",
  "/coupons": "customers",
  "/stats": "stats",
  "/settings": "owner",
  "/staff": "owner",
  "/home": "home",
  "/photos": "home",
  "/notices": "boards",
  "/reviews": "boards",
  "/inquiries": "boards",
  "/faq": "boards",
  "/categories": "products",
  "/products": "products",
  "/group-buys": "products",
  "/restock": "products",
  "/shipping": "products",
};

export function cleanPerms(input: unknown): Perms {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return Object.fromEntries(PERM_GROUPS.map((g) => [g.key, o[g.key] === true])) as Perms;
}

/** 이 메뉴를 볼 수 있는가 — 모르는 메뉴는 대표만 */
export function canSeeMenu(href: string, me: MyStaff): boolean {
  if (!me) return false;
  if (me.role === "owner") return true;
  const need = MENU_PERM[href] ?? "owner";
  if (need === "any") return true;
  if (need === "owner") return false;
  return me.perms?.[need] === true;
}

/** 권한 요약 글자 — 「주문·견적, 통계」 / 「권한 없음」 */
export function permsLabel(perms: unknown): string {
  const p = cleanPerms(perms);
  const on = PERM_GROUPS.filter((g) => p[g.key]).map((g) => g.label);
  return on.length ? on.join(", ") : "권한 없음";
}

export const ACCESS_ACTION_LABEL: Record<string, string> = {
  view_customer: "손님 정보 열람",
  view_order: "주문 정보 열람",
  staff_invite: "직원 초대",
  staff_accept: "초대 수락",
  staff_perms: "권한 변경",
  staff_remove: "직원 내보내기",
  staff_invite_revoke: "초대 거두기",
};
