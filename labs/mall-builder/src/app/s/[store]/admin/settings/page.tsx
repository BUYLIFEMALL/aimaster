import { getStaffStore } from "@/lib/store";
import { readBusinessInfo } from "@/lib/businessInfo";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../admin-shell";
import SettingsForm from "./settings-form";
import DepositForm, { type DepositStatus } from "./deposit-form";
import NotifyForm, { type NotifyStatus } from "./notify-form";
import EmailForm, { type EmailStatus } from "./email-form";
import PaymentForm, { type PaymentStatus } from "./payment-form";
import TaxForm, { type TaxStatus } from "./tax-form";
import ClosedForm, { type ClosedStatus } from "./closed-form";
import AutoProgressForm, { type AutoProgressStatus } from "./auto-progress-form";
import GuestForm from "./guest-form";
import RestockForm, { type RestockStatus } from "./restock-form";
import AiForm, { type AiStatus } from "./ai-form";
import { guestOrderEnabled } from "@/lib/guest";
import NotifyLog, { loadNotifyLog } from "@/app/notify-log";
import { digits } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function depositStatus(storeId: string): Promise<DepositStatus & { auto: AutoProgressStatus }> {
  const supabase = await createClient();
  const [{ data: row }, { data: key }] = await Promise.all([
    supabase
      .from("mall_builder_store_schedulers")
      .select("deposit_hours, job_id, paused, last_run_at, last_cancelled, total_cancelled, auto_deliver_days, auto_confirm_days, last_auto_progressed, total_auto_progressed")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase.rpc("mall_builder_scheduler_api_key", { p_store_id: storeId }),
  ]);
  return {
    hours: row?.deposit_hours ?? null,
    hasKey: Boolean(key),
    linked: row?.job_id != null,
    paused: row?.paused ?? false,
    lastRunAt: row?.last_run_at ?? null,
    lastCancelled: row?.last_cancelled ?? 0,
    totalCancelled: row?.total_cancelled ?? 0,
    auto: {
      deliverDays: row?.auto_deliver_days ?? null,
      confirmDays: row?.auto_confirm_days ?? null,
      hasCronKey: Boolean(key),
      linked: row?.job_id != null,
      paused: row?.paused ?? false,
      lastRunAt: row?.last_run_at ?? null,
      lastProgressed: row?.last_auto_progressed ?? 0,
      totalProgressed: row?.total_auto_progressed ?? 0,
    },
  };
}

async function notifyStatus(storeId: string, deposit: DepositStatus): Promise<NotifyStatus> {
  const supabase = await createClient();
  const [{ data: row }, { data: creds }] = await Promise.all([
    supabase.from("mall_builder_store_notify_settings").select("sender_phone, staff_phone, kinds").eq("store_id", storeId).maybeSingle(),
    supabase.rpc("mall_builder_notify_credentials", { p_store_id: storeId }),
  ]);
  const c = (creds ?? {}) as { api_key?: string; api_secret?: string };
  const pretty = (p: string) => (/^010\d{8}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}` : p);
  return {
    hasKey: Boolean(c.api_key && c.api_secret), // 키 값은 화면으로 보내지 않는다
    hasCronKey: deposit.hasKey,
    sender: pretty(digits(row?.sender_phone ?? "")),
    staff: pretty(digits(row?.staff_phone ?? "")),
    kinds: (row?.kinds as string[] | undefined) ?? [],
    linked: deposit.linked,
    paused: deposit.paused,
  };
}

async function emailStatus(storeId: string, deposit: DepositStatus): Promise<EmailStatus> {
  const supabase = await createClient();
  const [{ data: row }, { data: creds }] = await Promise.all([
    supabase.from("mall_builder_store_notify_settings").select("email_from, staff_email, email_kinds").eq("store_id", storeId).maybeSingle(),
    supabase.rpc("mall_builder_email_credentials", { p_store_id: storeId }),
  ]);
  return {
    hasKey: Boolean((creds as { api_key?: string } | null)?.api_key), // 키 값은 화면으로 보내지 않는다
    hasCronKey: deposit.hasKey,
    from: row?.email_from ?? "",
    staff: row?.staff_email ?? "",
    kinds: (row?.email_kinds as string[] | undefined) ?? [],
    linked: deposit.linked,
    paused: deposit.paused,
  };
}

async function restockStatus(storeId: string): Promise<RestockStatus> {
  const supabase = await createClient();
  const [{ data: row }, { count }] = await Promise.all([
    supabase.from("mall_builder_store_notify_settings").select("restock_sms, restock_email").eq("store_id", storeId).maybeSingle(),
    supabase.from("mall_builder_restock_requests").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "waiting"),
  ]);
  return { sms: Boolean(row?.restock_sms), email: Boolean(row?.restock_email), waiting: count ?? 0 };
}

async function paymentStatus(storeId: string): Promise<PaymentStatus> {
  const supabase = await createClient();
  const [{ data: row }, { data: secret }] = await Promise.all([
    supabase.from("mall_builder_store_payment_settings").select("toss_client_key, card_enabled").eq("store_id", storeId).maybeSingle(),
    supabase.rpc("mall_builder_payment_secret_status", { p_store_id: storeId }),
  ]);
  const s = (secret ?? {}) as { has_secret?: boolean; mode?: string };
  return { clientKey: row?.toss_client_key ?? "", enabled: row?.card_enabled ?? false, hasSecret: Boolean(s.has_secret), secretMode: s.mode ?? "" };
}

// 세금계산서 발행(볼타, D19) — 키는 있음·종류만, 설정 칸은 운영자만 읽는 표
async function taxStatus(storeId: string): Promise<TaxStatus> {
  const supabase = await createClient();
  const [{ data: row }, { data: k }] = await Promise.all([
    supabase.from("mall_builder_store_tax_settings").select("manager_email, business_type, business_item").eq("store_id", storeId).maybeSingle(),
    supabase.rpc("mall_builder_tax_key_status", { p_store_id: storeId }),
  ]);
  const s = (k ?? {}) as { has_key?: boolean; mode?: string };
  return { hasKey: Boolean(s.has_key), mode: s.mode ?? "", managerEmail: row?.manager_email ?? "", businessType: row?.business_type ?? "", businessItem: row?.business_item ?? "" };
}

// 폐쇄몰(D20) — 코드·사용 수·입장 대기 수는 운영자 함수로만
async function closedStatus(storeId: string): Promise<ClosedStatus> {
  const { data } = await (await createClient()).rpc("mall_builder_closed_status", { p_store_id: storeId });
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    enabled: d.enabled === true, approval: d.approval === true, code: d.code === true, notice: typeof d.notice === "string" ? d.notice : "",
    inviteCode: typeof d.invite_code === "string" ? d.invite_code : "", inviteUses: Number(d.invite_uses ?? 0), pending: Number(d.pending ?? 0),
  };
}

/** D27 AI 견적 보조 상태(키는 끝 4자리만) */
async function aiStatus(storeId: string): Promise<AiStatus> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_ai_status", { p_store_id: storeId });
  const d = (data ?? {}) as { has_key?: boolean; hint?: string; model?: string; min_margin?: number };
  return { hasKey: d.has_key === true, hint: d.hint ?? "", model: d.model ?? "claude-sonnet-5-5", minMargin: d.min_margin ?? 10 };
}

export default async function StoreSettingsPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/settings`);
  if (!staff) return <NoPermission />;
  const deposit = await depositStatus(store.id);
  const [notify, email, log, payment, restock, tax, closed, ai] = await Promise.all([
    notifyStatus(store.id, deposit),
    emailStatus(store.id, deposit),
    loadNotifyLog(store.id),
    paymentStatus(store.id),
    restockStatus(store.id),
    taxStatus(store.id),
    closedStatus(store.id),
    aiStatus(store.id),
  ]);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/settings">
      <SettingsForm slug={store.slug} name={store.name} info={readBusinessInfo(store.business_info)} />
      <div className="mt-6">
        <PaymentForm slug={store.slug} status={payment} />
      </div>
      <div className="mt-6">
        <TaxForm slug={store.slug} status={tax} />
      </div>
      <div className="mt-6">
        <AiForm slug={store.slug} status={ai} />
      </div>
      <div className="mt-6">
        <ClosedForm slug={store.slug} status={closed} customersHref={`/s/${store.slug}/admin/customers?member=pending`} />
      </div>
      <div className="mt-6">
        <GuestForm slug={store.slug} enabled={guestOrderEnabled(store.settings)} />
      </div>
      <div className="mt-6">
        <DepositForm slug={store.slug} status={deposit} />
      </div>
      <div className="mt-6">
        <AutoProgressForm slug={store.slug} status={deposit.auto} />
      </div>
      <div className="mt-6">
        <NotifyForm slug={store.slug} status={notify} />
      </div>
      <div className="mt-6">
        <EmailForm slug={store.slug} status={email} />
      </div>
      <div className="mt-6">
        <RestockForm slug={store.slug} status={restock} />
      </div>
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">최근 알림 기록</h3>
        <NotifyLog rows={log} empty="아직 보낸 알림이 없습니다." />
      </section>
    </AdminShell>
  );
}
