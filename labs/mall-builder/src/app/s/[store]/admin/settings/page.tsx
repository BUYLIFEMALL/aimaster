import { getStaffStore } from "@/lib/store";
import { readBusinessInfo } from "@/lib/businessInfo";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../admin-shell";
import SettingsForm from "./settings-form";
import DepositForm, { type DepositStatus } from "./deposit-form";
import NotifyForm, { type NotifyStatus } from "./notify-form";
import EmailForm, { type EmailStatus } from "./email-form";
import PaymentForm, { type PaymentStatus } from "./payment-form";
import NotifyLog, { loadNotifyLog } from "@/app/notify-log";
import { digits } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function depositStatus(storeId: string): Promise<DepositStatus> {
  const supabase = await createClient();
  const [{ data: row }, { data: key }] = await Promise.all([
    supabase.from("mall_builder_store_schedulers").select("deposit_hours, job_id, paused, last_run_at, last_cancelled, total_cancelled").eq("store_id", storeId).maybeSingle(),
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

async function paymentStatus(storeId: string): Promise<PaymentStatus> {
  const supabase = await createClient();
  const [{ data: row }, { data: secret }] = await Promise.all([
    supabase.from("mall_builder_store_payment_settings").select("toss_client_key, card_enabled").eq("store_id", storeId).maybeSingle(),
    supabase.rpc("mall_builder_payment_secret_status", { p_store_id: storeId }),
  ]);
  const s = (secret ?? {}) as { has_secret?: boolean; mode?: string };
  return { clientKey: row?.toss_client_key ?? "", enabled: row?.card_enabled ?? false, hasSecret: Boolean(s.has_secret), secretMode: s.mode ?? "" };
}

export default async function StoreSettingsPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/settings`);
  if (!staff) return <NoPermission />;
  const deposit = await depositStatus(store.id);
  const [notify, email, log, payment] = await Promise.all([
    notifyStatus(store.id, deposit),
    emailStatus(store.id, deposit),
    loadNotifyLog(store.id),
    paymentStatus(store.id),
  ]);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/settings">
      <SettingsForm slug={store.slug} name={store.name} info={readBusinessInfo(store.business_info)} />
      <div className="mt-6">
        <PaymentForm slug={store.slug} status={payment} />
      </div>
      <div className="mt-6">
        <DepositForm slug={store.slug} status={deposit} />
      </div>
      <div className="mt-6">
        <NotifyForm slug={store.slug} status={notify} />
      </div>
      <div className="mt-6">
        <EmailForm slug={store.slug} status={email} />
      </div>
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">최근 알림 기록</h3>
        <NotifyLog rows={log} empty="아직 보낸 알림이 없습니다." />
      </section>
    </AdminShell>
  );
}
