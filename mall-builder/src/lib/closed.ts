// 폐쇄몰(D20) — 몰 설정 settings.closed 읽기와 「승인 전에도 열어 둘 경로」 판단. 상품·주문은 DB가 막고(0040), 화면은 레이아웃이 안내로 바꾼다
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type ClosedSettings = { enabled: boolean; approval: boolean; code: boolean; notice: string };
export type MemberStatus = "approved" | "pending" | "rejected";

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = { approved: "입장 승인", pending: "입장 대기", rejected: "입장 반려" };

export function readClosed(settings: unknown): ClosedSettings {
  const c = settings && typeof settings === "object" ? (settings as { closed?: unknown }).closed : null;
  const o = c && typeof c === "object" ? (c as Record<string, unknown>) : {};
  return { enabled: o.enabled === true, approval: o.approval === true, code: o.code === true, notice: typeof o.notice === "string" ? o.notice : "" };
}

/** 승인 전 손님에게도 열어 둘 몰 안 경로: 가입·마이페이지(입장 상태·코드 입력) */
export function openWhileClosed(pathname: string | null, slug: string): boolean {
  if (!pathname) return false;
  const base = `/s/${slug}`;
  return pathname === `${base}/join` || pathname.startsWith(`${base}/join/`) || pathname === `${base}/my` || pathname.startsWith(`${base}/my/`);
}

/** 이 손님이 폐쇄몰 안을 볼 수 있는가(운영자는 언제나) */
export function canEnterClosed(closed: ClosedSettings, staff: boolean, memberStatus: MemberStatus | null | undefined): boolean {
  return !closed.enabled || staff || memberStatus === "approved";
}
