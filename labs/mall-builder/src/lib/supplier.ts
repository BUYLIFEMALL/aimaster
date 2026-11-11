// D34 입점형 마켓플레이스 — 공급사 상태·글자. DB(0053)가 권한·상태 변경을 다시 검사한다
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type SupplierStatus = "invited" | "active" | "paused" | "revoked";

export type SupplierRow = {
  id: string;
  store_id: string;
  user_id: string | null;
  name: string;
  email: string;
  biz_no: string;
  contact_name: string;
  phone: string;
  memo: string;
  status: SupplierStatus;
  auto_approve: boolean;
  invite_expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

export const SUPPLIER_COLUMNS = "id, store_id, user_id, name, email, biz_no, contact_name, phone, memo, status, auto_approve, invite_expires_at, accepted_at, created_at";

export const SUPPLIER_STATUS_LABEL: Record<SupplierStatus, string> = {
  invited: "수락 대기",
  active: "입점 중",
  paused: "쉬는 중",
  revoked: "초대 거둠",
};

/** 운영자가 고를 수 있는 다음 상태 — DB 함수와 같은 규칙 */
export function nextStatuses(s: SupplierStatus): SupplierStatus[] {
  if (s === "invited") return ["invited", "revoked"];
  if (s === "active" || s === "paused") return ["active", "paused"];
  return [];
}

/** 초대 링크가 아직 쓸 수 있는가 */
export function inviteAlive(row: Pick<SupplierRow, "status" | "invite_expires_at">, now = Date.now()): boolean {
  return row.status === "invited" && !!row.invite_expires_at && new Date(row.invite_expires_at).getTime() > now;
}

/** 공급사 초대 링크 토큰 모양(48자리 16진수) */
export const isInviteToken = (t: string) => /^[0-9a-f]{48}$/.test(t);

// ── D35 공급사 상품 승인 ──
export type Approval = "approved" | "pending" | "rejected";

export const APPROVAL_LABEL: Record<Approval, string> = {
  approved: "승인됨",
  pending: "승인 대기",
  rejected: "반려",
};

/** 공급사 상품이 손님에게 보이는가(DB mall_builder_product_visible과 같은 규칙의 요약) */
export function supplierProductLive(p: { approval: Approval; status: string }, supplierStatus: SupplierStatus): boolean {
  return p.approval === "approved" && (p.status === "on_sale" || p.status === "sold_out") && supplierStatus === "active";
}

/** 마진(판매가 − 공급가)과 마진율(%) — 판매가 0이면 0% */
export function marginOf(base: number, supply: number): { won: number; rate: number } {
  const won = base - supply;
  return { won, rate: base > 0 ? Math.round((won / base) * 1000) / 10 : 0 };
}

// ── D37 공급사 정산(공급가 방식) ──
export type LedgerKind = "earn" | "reclaim" | "settle" | "adjust";
export const SUPPLIER_LEDGER_LABEL: Record<LedgerKind, string> = {
  earn: "구매 확정 적립",
  reclaim: "확정 뒤 취소·반품 차감",
  settle: "정산 지급",
  adjust: "조정",
};

/** 한국 시각 기준 「YYYY-MM」 */
export function monthKst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type MonthRow = { month: string; earned: number; reclaimed: number; settled: number; net: number };

/** 월별 정산서 — 적립·차감·지급 합계와 순적립(적립+차감), 최근 달 먼저 */
export function monthlySummary(rows: { kind: LedgerKind; amount: number; created_at: string }[]): MonthRow[] {
  const m = new Map<string, MonthRow>();
  for (const r of rows) {
    const k = monthKst(r.created_at);
    const row = m.get(k) ?? { month: k, earned: 0, reclaimed: 0, settled: 0, net: 0 };
    if (r.kind === "earn") row.earned += r.amount;
    else if (r.kind === "reclaim") row.reclaimed += r.amount;
    else if (r.kind === "settle") row.settled += -r.amount;
    else row.reclaimed += r.amount;
    row.net = row.earned + row.reclaimed;
    m.set(k, row);
  }
  return [...m.values()].sort((a, b) => b.month.localeCompare(a.month));
}
