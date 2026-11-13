// T2 분양몰 공통 규칙(0061) — DB 함수와 같은 검사를 화면에서도 미리 보여 준다

export type ResaleApplicationStatus = "pending" | "approved" | "rejected" | "cancelled";

export const RESALE_STATUS_LABEL: Record<ResaleApplicationStatus, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "반려",
  cancelled: "취소함",
};

export type ResaleApplication = {
  id: string;
  source_store_id: string;
  user_id: string;
  slug: string;
  name: string;
  phone: string;
  channel: string;
  memo: string;
  status: ResaleApplicationStatus;
  note: string;
  store_id: string | null;
  created_at: string;
  decided_at: string | null;
};

/** 처음 승인 때 기본 이용 기간(일) — 관리자 지침: 시험·검수 기본 2주 */
export const DEFAULT_RESALE_DAYS = 14;

/** 몰 주소 규칙(DB mall_builder_stores_slug_check와 같음) */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,29}$/.test(slug) && !slug.includes("--") && !slug.endsWith("-");
}

/** 이용 기간 남은 날(올림). 끝났으면 0, 기간이 없으면 null */
export function resaleDaysLeft(expiresAt: string | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/** 분양몰이 지금 주문을 받을 수 있나(DB mall_builder_orders_resale_open과 같은 규칙) */
export function resaleOpen(store: { kind: string; resale_expires_at: string | null }, now: Date = new Date()): boolean {
  if (store.kind !== "resale") return true;
  return !!store.resale_expires_at && new Date(store.resale_expires_at).getTime() > now.getTime();
}

/** 몰 설정 modules에서 「분양 받기」 켜짐 여부 */
export function resaleAccepting(modules: unknown): boolean {
  return !!modules && typeof modules === "object" && (modules as Record<string, unknown>).resale === true;
}

/** 분양 상품(거울) 상태 — hidden은 본사가 판매를 멈춘 것, draft는 분양자가 뺀 것(주문 기록이 있어 숨김) */
export const MIRROR_STATUS_LABEL: Record<string, string> = {
  on_sale: "판매 중",
  sold_out: "품절",
  hidden: "본사 판매 중지",
  draft: "뺀 상품",
};

export const RESALE_LEDGER_LABEL: Record<string, string> = { earn: "마진 적립", reclaim: "마진 회수", payout: "출금 신청", refund: "출금 반려(돌려줌)" };
export const RESALE_PAYOUT_LABEL: Record<string, string> = { requested: "처리 대기", paid: "지급 완료", rejected: "반려" };
/** 출금 최소 금액(DB mall_builder_resale_payout_request와 같음) */
export const RESALE_PAYOUT_MIN = 10_000;
