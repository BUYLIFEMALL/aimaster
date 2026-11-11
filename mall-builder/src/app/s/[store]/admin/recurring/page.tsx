import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { getRecurringPaused, getRecurringRuns, getStoreRecurring } from "@/lib/recurring-store";
import { pauseAllRecurringAction } from "@/lib/recurring-actions";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../admin-shell";
import { RecurringList } from "../../recurring-list";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D30 운영자 「정기 주문」 — 몰 전체 정기 주문·최근 회차·실패 사유, 전체 일시정지 단추 하나(「주문」 권한)
export default async function AdminRecurringPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/recurring`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const [rows, runs, paused, { data: sch }] = await Promise.all([
    getStoreRecurring(store.id),
    getRecurringRuns(store.id, undefined, 300),
    getRecurringPaused(store.id),
    supabase.from("mall_builder_store_schedulers").select("job_id, paused").eq("store_id", store.id).maybeSingle(),
  ]);
  const schedulerOn = !!sch?.job_id && !sch.paused;
  const active = rows.filter((r) => r.status === "active").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const back = `/s/${store.slug}/admin/recurring`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/recurring">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">🔁 정기 주문</h2>
        <span className="text-sm text-gray-500">진행 중 {active} · 최근 실패 {failed}</span>
        <form action={pauseAllRecurringAction.bind(null, store.slug, !paused)} className="ml-auto">
          <button className={`min-h-11 rounded px-4 py-2 text-sm ${paused ? "bg-gray-900 text-white" : "border border-red-300 text-red-700"}`} data-recurring-pause-all>
            {paused ? "▶ 자동 실행 다시 켜기" : "⏸ 정기 주문 자동 실행 모두 멈추기"}
          </button>
        </form>
      </div>
      {paused && <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">지금 정기 주문 자동 실행이 멈춰 있습니다. 주문일이 지나도 주문을 만들지 않습니다.</p>}
      {!schedulerOn && (
        <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800" data-scheduler-off>
          자동 실행(cron-job.org)이 꺼져 있어 정기 주문이 만들어지지 않습니다. <Link href={`/s/${store.slug}/admin/settings`} className="underline">쇼핑몰 정보</Link>의 「입금 기한 자동 취소」 칸에서 자동 실행(cron-job.org)을 켜 주세요.
        </p>
      )}
      <p className="mb-4 text-sm text-gray-600">거래처가 지난 주문 상세에서 만든 정기 주문입니다. 주문일 아침 8시 이후 첫 자동 실행 때 그날 가격으로 주문을 만들고(외상은 바로 결제 완료, 무통장은 입금 대기), 실패하면 주문하지 않고 손님에게 문자로 알립니다.</p>
      <RecurringList slug={store.slug} rows={rows} runs={runs} back={back} admin />
    </AdminShell>
  );
}
