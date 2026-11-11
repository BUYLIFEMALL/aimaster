// 공동구매(D21) — 화면 표시용. 판정·주문 규칙은 DB(0041)가 한다
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type GroupBuyStatus = "active" | "succeeded" | "failed" | "failed_done" | "cancelled";

export type GroupBuyInfo = {
  id: string;
  title: string;
  group_price: number;
  target_qty: number;
  max_per_customer: number | null;
  starts_at: string;
  ends_at: string;
  status: GroupBuyStatus;
  open: boolean;
  achieved_qty: number;
};

export const GROUP_BUY_STATUS_LABEL: Record<GroupBuyStatus, string> = {
  active: "진행 중",
  succeeded: "목표 달성",
  failed: "목표 미달(취소 대기)",
  failed_done: "목표 미달(취소 끝)",
  cancelled: "그만둠",
};

/** 진행률(%) — 0~100 */
export function progressPercent(achieved: number, target: number): number {
  if (!(target > 0)) return 0;
  return Math.max(0, Math.min(100, Math.floor((achieved / target) * 100)));
}

/** 남은 시간 글자 — 「2일 3시간 남음」「45분 남음」「마감」 */
export function remainingLabel(endsAt: string, now = Date.now()): string {
  const ms = Date.parse(endsAt) - now;
  if (!(ms > 0)) return "마감";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}일 ${h}시간 남음`;
  if (h > 0) return `${h}시간 ${m}분 남음`;
  return `${Math.max(1, m)}분 남음`;
}

/** 운영자 입력 검사 — 공동구매 만들기 */
export function validateGroupBuy(f: { title: string; group_price: number; target_qty: number; max_per_customer: number | null; starts_at: string; ends_at: string }): string | null {
  if (!f.title.trim() || f.title.trim().length > 60) return "공동구매 이름을 1~60자로 입력해 주세요.";
  if (!Number.isInteger(f.group_price) || f.group_price < 0) return "공동구매 가격을 다시 입력해 주세요.";
  if (!Number.isInteger(f.target_qty) || f.target_qty < 1 || f.target_qty > 100000) return "목표 수량은 1~100,000개로 입력해 주세요.";
  if (f.max_per_customer != null && (!Number.isInteger(f.max_per_customer) || f.max_per_customer < 1 || f.max_per_customer > 10000)) return "1인 최대 수량을 다시 입력해 주세요.";
  const s = Date.parse(f.starts_at);
  const e = Date.parse(f.ends_at);
  if (Number.isNaN(s) || Number.isNaN(e)) return "시작·마감 시각을 다시 골라 주세요.";
  if (e <= s) return "마감 시각은 시작 시각보다 뒤여야 합니다.";
  return null;
}
