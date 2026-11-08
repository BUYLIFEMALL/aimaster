import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/orders";
import { maskPhone } from "@/lib/notify";
import { groupWaiting, RESTOCK_SELECT, RESTOCK_STATUS_LABEL, restockLabel, type RestockRow } from "@/lib/restock";
import { cancelRestockAction } from "@/lib/restock-actions";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 운영자 재입고 알림(D16) — 상품(옵션)별 대기 인원과 최근 신청 목록. 재고를 채우면 대기 신청에 자동으로 알림이 간다
export default async function AdminRestockPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/restock`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const [{ data }, { data: ns }] = await Promise.all([
    supabase.from("mall_builder_restock_requests").select(RESTOCK_SELECT).eq("store_id", store.id).order("created_at", { ascending: false }).limit(300),
    supabase.from("mall_builder_store_notify_settings").select("restock_sms, restock_email").eq("store_id", store.id).maybeSingle(),
  ]);
  const rows = (data ?? []) as unknown as RestockRow[];
  const groups = groupWaiting(rows);
  const on = Boolean(ns?.restock_sms || ns?.restock_email);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/restock">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <p className={`mb-4 rounded px-3 py-2 text-sm ${on ? "bg-gray-50 text-gray-700" : "bg-amber-50 text-amber-800"}`} data-restock-switch>
        {on
          ? "재입고 알림이 켜져 있습니다. 상품 재고를 채우거나 「판매 중」으로 바꾸면 1분 안에 대기 손님에게 자동으로 알립니다."
          : "재입고 알림이 꺼져 있어 신청만 받고 있습니다. "}
        <Link href={`/s/${store.slug}/admin/settings`} className="underline">{on ? "설정" : "쇼핑몰 정보 → 재입고 알림에서 켜기"}</Link>
      </p>

      <h2 className="text-sm font-semibold">기다리는 상품 ({groups.length})</h2>
      {groups.length === 0 && <p className="mt-2 text-sm text-gray-500">대기 중인 신청이 없습니다.</p>}
      <ul className="mt-2 divide-y rounded border text-sm" data-restock-groups>
        {groups.map((g) => (
          <li key={g.key} className="flex items-center justify-between gap-2 px-3 py-2">
            <Link href={`/s/${store.slug}/admin/products/${g.productId}`} className="underline">{g.label}</Link>
            <span>대기 <b>{g.count}</b>명</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-sm font-semibold">최근 신청 ({rows.length})</h2>
      <ul className="mt-2 divide-y rounded border text-sm" data-restock-list>
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className={`rounded px-1.5 text-xs ${r.status === "waiting" ? "bg-amber-50 text-amber-800" : r.status === "notified" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
              {RESTOCK_STATUS_LABEL[r.status] ?? r.status}
            </span>
            <span className="font-medium">{restockLabel(r)}</span>
            <span className="text-gray-600">{r.phone ? maskPhone(r.phone) : "번호 지움"}</span>
            <span className="text-xs text-gray-400">신청 {formatDateTime(r.created_at)}{r.ended_at && ` · ${RESTOCK_STATUS_LABEL[r.status]} ${formatDateTime(r.ended_at)}`}</span>
            {r.status === "waiting" && (
              <form action={cancelRestockAction.bind(null, store.slug, r.id, "admin")} className="ml-auto">
                <button className="rounded border px-2 py-1 text-xs">신청 취소</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
