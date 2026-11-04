import { getStaffStore } from "@/lib/store";
import { readBusinessInfo } from "@/lib/businessInfo";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../admin-shell";
import SettingsForm from "./settings-form";
import DepositForm, { type DepositStatus } from "./deposit-form";

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

export default async function StoreSettingsPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/settings`);
  if (!staff) return <NoPermission />;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/settings">
      <SettingsForm slug={store.slug} name={store.name} info={readBusinessInfo(store.business_info)} />
      <div className="mt-6">
        <DepositForm slug={store.slug} status={await depositStatus(store.id)} />
      </div>
    </AdminShell>
  );
}
