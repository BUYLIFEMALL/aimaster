// D33 리셀러 — 서버 읽기(보안 규칙상 리셀러 본인은 자기 것만, 「손님」 권한 직원은 몰 전체)
import { createClient } from "./supabase/server";
import type { LedgerKind, PayoutStatus } from "./reseller";
import { RESELLER_APPLY_COLUMNS, type ResellerApplication } from "./reseller-apply";

export type ResellerSummary = { id: string; code: string; rate: number; active: boolean; linked: number; balance: number; month_earned: number; pending: number;
  // M1-7(0075) — 운영 DB에 0075가 없으면 비어 있음
  scheduled?: number; payout_min?: number; payee_type?: "individual" | "business"; saved_bank?: string | null };
export type ResellerRow = { id: string; customer_id: string; code: string; rate: number; active: boolean; created_at: string; customer?: { name: string; company: string | null } | null };
export type LedgerRow = { id: string; reseller_id: string; order_id: string | null; kind: LedgerKind; amount: number; balance_after: number; note: string; created_at: string };
export type PayoutRow = { id: string; reseller_id: string; amount: number; bank_name: string; bank_account: string; bank_holder: string; status: PayoutStatus; reason: string | null; requested_at: string; decided_at: string | null;
  payee_type?: "individual" | "business"; deduction?: number; transfer_amount?: number | null };

const CUSTOMER_JOIN = "customer:mall_builder_store_customers!mall_builder_resellers_customer_id_fkey(name, company)";

export async function getMyResellerSummary(storeId: string): Promise<ResellerSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_reseller_my_summary", { p_store_id: storeId });
  return (data ?? null) as ResellerSummary | null;
}

export async function getResellerLedger(resellerId: string, limit = 30): Promise<LedgerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_reseller_ledger")
    .select("id, reseller_id, order_id, kind, amount, balance_after, note, created_at")
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as LedgerRow[];
}

const PAYOUT_COLS = "id, reseller_id, amount, bank_name, bank_account, bank_holder, status, reason, requested_at, decided_at";
export async function getPayouts(storeId: string, resellerId?: string, limit = 100): Promise<PayoutRow[]> {
  const supabase = await createClient();
  // M1-7(0075) 공제·이체 칸 — 운영 DB에 0075가 없으면 옛 칸으로 다시 읽음
  for (const cols of [PAYOUT_COLS + ", payee_type, deduction, transfer_amount", PAYOUT_COLS]) {
    let q = supabase.from("mall_builder_reseller_payouts").select(cols).eq("store_id", storeId);
    if (resellerId) q = q.eq("reseller_id", resellerId);
    const { data, error } = await q.order("requested_at", { ascending: false }).limit(limit);
    if (!error) return (data ?? []) as unknown as PayoutRow[];
  }
  return [];
}

/** 운영자: 리셀러 목록 + 연결 손님 수·잔액·이번 달 적립 */
export async function getStoreResellers(storeId: string) {
  const supabase = await createClient();
  const monthStart = Date.parse(new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 8) + "01T00:00:00+09:00");
  const [{ data: rs }, { data: links }, { data: ledger }] = await Promise.all([
    supabase.from("mall_builder_resellers").select(`id, customer_id, code, rate, active, created_at, ${CUSTOMER_JOIN}`).eq("store_id", storeId).order("created_at"),
    supabase.from("mall_builder_store_customers").select("reseller_id").eq("store_id", storeId).not("reseller_id", "is", null).limit(10000),
    supabase.from("mall_builder_reseller_ledger").select("reseller_id, kind, amount, created_at").eq("store_id", storeId).limit(20000),
  ]);
  const linked = new Map<string, number>();
  for (const l of links ?? []) linked.set(l.reseller_id as string, (linked.get(l.reseller_id as string) ?? 0) + 1);
  const balance = new Map<string, number>();
  const month = new Map<string, number>();
  for (const x of ledger ?? []) {
    const id = x.reseller_id as string;
    balance.set(id, (balance.get(id) ?? 0) + Number(x.amount));
    if ((x.kind === "earn" || x.kind === "reclaim") && Date.parse(x.created_at as string) >= monthStart) month.set(id, (month.get(id) ?? 0) + Number(x.amount));
  }
  return ((rs ?? []) as unknown as ResellerRow[]).map((r) => ({ ...r, rate: Number(r.rate), linked: linked.get(r.id) ?? 0, balance: balance.get(r.id) ?? 0, month_earned: month.get(r.id) ?? 0 }));
}

/** 운영자 손님 상세: 이 손님의 리셀러 정보·연결된 리셀러·고를 수 있는 리셀러 */
export async function getCustomerResellerInfo(storeId: string, customerId: string) {
  const supabase = await createClient();
  const [{ data: mine }, { data: cust }, { data: all }] = await Promise.all([
    supabase.from("mall_builder_resellers").select("id, code, rate, active").eq("customer_id", customerId).maybeSingle(),
    supabase.from("mall_builder_store_customers").select("reseller_id").eq("id", customerId).maybeSingle(),
    supabase.from("mall_builder_resellers").select(`id, code, ${CUSTOMER_JOIN}`).eq("store_id", storeId).eq("active", true).neq("customer_id", customerId).order("code"),
  ]);
  type Opt = { id: string; code: string; customer: { name: string; company: string | null } | null };
  return {
    mine: mine ? { ...(mine as { id: string; code: string; active: boolean }), rate: Number((mine as { rate: number }).rate) } : null,
    linkedTo: (cust?.reseller_id as string | null) ?? null,
    options: ((all ?? []) as unknown as Opt[]).map((r) => ({ id: r.id, label: `${r.code} · ${r.customer?.company || r.customer?.name || ""}` })),
  };
}

// M1-4(0071) 리셀러 신청 — 본사(「손님」 권한)는 몰 전체, 신청자는 자기 것만(보안 규칙)

export async function getResellerApplications(storeId: string): Promise<ResellerApplication[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_reseller_applications").select(RESELLER_APPLY_COLUMNS).eq("store_id", storeId).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as ResellerApplication[];
  return [...rows.filter((r) => r.status === "pending"), ...rows.filter((r) => r.status !== "pending")];
}

/** 신청자 본인: 이 몰에 낸 가장 최근 리셀러 신청 */
export async function getMyResellerApplication(storeId: string, userId: string): Promise<ResellerApplication | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_reseller_applications").select(RESELLER_APPLY_COLUMNS).eq("store_id", storeId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data ?? null) as ResellerApplication | null;
}

/** M1-5(0072) 주문의 리셀러 기록 — 운영 DB에 0072가 아직 없으면(칸 없음) 조용히 null */
export async function getOrderRef(orderId: string): Promise<{ code: string; source: "link" | "customer" } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mall_builder_orders").select("ref_code, ref_source").eq("id", orderId).maybeSingle();
  if (error || !data?.ref_code || !data.ref_source) return null;
  return { code: data.ref_code as string, source: data.ref_source as "link" | "customer" };
}

/** M1-7(0075) 몰 최소 출금 금액 — 운영 DB에 0075가 없으면(칸 없음) null → 화면은 기본값 */
export async function getPayoutMin(storeId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mall_builder_stores").select("reseller_payout_min").eq("id", storeId).maybeSingle();
  if (error || data?.reseller_payout_min == null) return null;
  return Number(data.reseller_payout_min);
}

// ── M1-8 운영 화면(리워드 상품·적립 내역·계정) — 운영 DB에 0074~0076이 없으면 빈 값 ──
export type RewardProduct = { id: string; name: string; base_price: number; status: string; supplier: boolean; supplier_rate: number | null; reward_rate: number; reward_no_extra: boolean };
export async function getRewardProducts(storeId: string): Promise<{ ready: boolean; rows: RewardProduct[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mall_builder_products")
    .select("id, name, base_price, status, supplier_id, reward_rate, reward_no_extra, supply:mall_builder_product_supply(reseller_rate)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return { ready: false, rows: [] };
  type Raw = { id: string; name: string; base_price: number; status: string; supplier_id: string | null; reward_rate: number; reward_no_extra: boolean; supply: { reseller_rate: number } | { reseller_rate: number }[] | null };
  return {
    ready: true,
    rows: ((data ?? []) as unknown as Raw[]).map((p) => {
      const sup = Array.isArray(p.supply) ? p.supply[0] : p.supply;
      return { id: p.id, name: p.name, base_price: Number(p.base_price), status: p.status, supplier: !!p.supplier_id, supplier_rate: sup ? Number(sup.reseller_rate) : null, reward_rate: Number(p.reward_rate), reward_no_extra: !!p.reward_no_extra };
    }),
  };
}

export type RewardStatus = "pending" | "paid" | "held" | "deleted";
export type RewardRow = { id: string; reseller_id: string; order_id: string; name_snapshot: string; base_amount: number; product_rate: number; reseller_rate: number; amount: number; status: RewardStatus; note: string; created_at: string; decided_at: string | null; order: { order_no: string } | null };
export async function getRewards(storeId: string, status?: RewardStatus, limit = 300): Promise<{ ready: boolean; rows: RewardRow[] }> {
  const supabase = await createClient();
  let q = supabase
    .from("mall_builder_reseller_rewards")
    .select("id, reseller_id, order_id, name_snapshot, base_amount, product_rate, reseller_rate, amount, status, note, created_at, decided_at, order:mall_builder_orders(order_no)")
    .eq("store_id", storeId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
  if (error) return { ready: false, rows: [] };
  return { ready: true, rows: ((data ?? []) as unknown as RewardRow[]).map((w) => ({ ...w, amount: Number(w.amount), base_amount: Number(w.base_amount), product_rate: Number(w.product_rate), reseller_rate: Number(w.reseller_rate) })) };
}

/** 리셀러 정산 정보(0071) — 칸이 없으면 빈 지도 */
export async function getResellerPayees(storeId: string): Promise<Map<string, { payee_type: string; bank: string; channel: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mall_builder_resellers").select("id, payee_type, bank_name, bank_account, bank_holder, channel").eq("store_id", storeId);
  const m = new Map<string, { payee_type: string; bank: string; channel: string }>();
  if (error) return m;
  for (const r of (data ?? []) as { id: string; payee_type: string; bank_name: string; bank_account: string; bank_holder: string; channel: string }[]) {
    m.set(r.id, { payee_type: r.payee_type, bank: r.bank_account ? `${r.bank_name} ${r.bank_account} (${r.bank_holder})` : "", channel: r.channel ?? "" });
  }
  return m;
}
