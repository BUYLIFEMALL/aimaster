import Link from "next/link";
import { getStaffStore, getStoreProducts } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/orders";
import { GROUP_BUY_STATUS_LABEL, progressPercent, remainingLabel, type GroupBuyStatus } from "@/lib/groupBuy";
import { AdminShell, NoPermission } from "../admin-shell";
import { cancelAllGroupBuyAction, closeGroupBuyAction, createGroupBuyAction } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Row = { id: string; product_id: string; title: string; group_price: number; target_qty: number; max_per_customer: number | null; starts_at: string; ends_at: string; status: GroupBuyStatus; achieved_qty: number | null };

// 운영자 공동구매(D21) — 만들기·진행률·지금 마감·실패 일괄 취소. 마감 판정은 예약 실행이 자동으로
export default async function AdminGroupBuysPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/group-buys`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const [{ data }, products] = await Promise.all([
    supabase.from("mall_builder_group_buys").select("id, product_id, title, group_price, target_qty, max_per_customer, starts_at, ends_at, status, achieved_qty").eq("store_id", store.id).order("created_at", { ascending: false }).limit(100),
    getStoreProducts(store.id),
  ]);
  const rows = (data ?? []) as Row[];
  // 진행 중인 건은 지금 수량을 함수로(결제 완료만)
  const live = new Map<string, number>();
  await Promise.all(rows.filter((r) => r.status === "active").map(async (r) => {
    const { data: info } = await supabase.rpc("mall_builder_group_buy_info", { p_product_id: r.product_id });
    const i = info as { id?: string; achieved_qty?: number } | null;
    if (i?.id === r.id) live.set(r.id, Number(i.achieved_qty ?? 0));
  }));
  const nameOf = new Map(products.map((p) => [p.id, p.name]));
  const sellable = products.filter((p) => p.status === "on_sale" || p.status === "sold_out");

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/group-buys">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}

      <section className="rounded border p-4" data-new-group-buy>
        <h2 className="text-sm font-semibold">새 공동구매</h2>
        <p className="mt-1 text-xs text-gray-500">손님은 참여할 때 바로 결제하고, 결제가 끝난 수량만 셉니다. 마감 시각이 지나면 자동으로 판정해 참여 손님에게 문자로 알립니다. 목표를 못 채우면 아래 목록의 「미달 주문 일괄 취소·환불」을 눌러 주세요.</p>
        <form action={createGroupBuyAction.bind(null, store.slug)} className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-gray-500">상품</span>
            <select name="product_id" required className="mt-0.5 w-full rounded border px-2 py-1.5">
              <option value="">상품을 고르세요</option>
              {sellable.map((p) => <option key={p.id} value={p.id}>{p.name} ({Number(p.base_price).toLocaleString("ko-KR")}원)</option>)}
            </select>
          </label>
          <label className="block"><span className="text-xs text-gray-500">공동구매 이름</span><input name="title" required maxLength={60} placeholder="예: 11월 공기청정기 공구" className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
          <label className="block"><span className="text-xs text-gray-500">공동구매 가격(옵션 추가금은 더해짐)</span><input name="group_price" type="number" min={0} required className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
          <label className="block"><span className="text-xs text-gray-500">목표 수량</span><input name="target_qty" type="number" min={1} required className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
          <label className="block"><span className="text-xs text-gray-500">1인 최대 수량(선택)</span><input name="max_per_customer" type="number" min={1} className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
          <label className="block"><span className="text-xs text-gray-500">시작(비우면 지금, 한국 시간)</span><input name="starts_at" type="datetime-local" className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
          <label className="block"><span className="text-xs text-gray-500">마감(한국 시간)</span><input name="ends_at" type="datetime-local" required className="mt-0.5 w-full rounded border px-2 py-1.5" /></label>
          <div className="sm:col-span-2"><button className="rounded bg-gray-900 px-4 py-1.5 text-white">공동구매 시작</button></div>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">공동구매 목록 ({rows.length})</h2>
        {rows.length === 0 && <p className="mt-2 text-sm text-gray-500">아직 공동구매가 없습니다.</p>}
        <ul className="mt-2 divide-y rounded border text-sm" data-group-buy-list>
          {rows.map((r) => {
            const qty = r.status === "active" ? live.get(r.id) ?? 0 : r.achieved_qty ?? 0;
            return (
              <li key={r.id} className="space-y-2 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 text-xs ${r.status === "active" ? "bg-orange-600 text-white" : r.status === "succeeded" ? "bg-gray-900 text-white" : "bg-red-100 text-red-800"}`}>{GROUP_BUY_STATUS_LABEL[r.status]}</span>
                  <b>{r.title}</b>
                  <Link href={`/s/${store.slug}/p/${r.product_id}`} className="text-xs underline">{nameOf.get(r.product_id) ?? "(상품)"}</Link>
                  <span className="text-gray-600">{Number(r.group_price).toLocaleString("ko-KR")}원</span>
                  <span className="ml-auto text-xs text-gray-500">{formatDateTime(r.starts_at)} ~ {formatDateTime(r.ends_at)}{r.status === "active" ? ` · ${remainingLabel(r.ends_at)}` : ""}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-orange-500" style={{ width: `${progressPercent(qty, r.target_qty)}%` }} /></div>
                <p className="text-xs text-gray-600" data-group-buy-qty>
                  결제 완료 {qty}개 / 목표 {r.target_qty}개 ({progressPercent(qty, r.target_qty)}%){r.max_per_customer ? ` · 1인 최대 ${r.max_per_customer}개` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {r.status === "active" && (
                    <form action={closeGroupBuyAction.bind(null, store.slug, r.id)}>
                      <button className="rounded border px-3 py-1 text-xs" data-group-buy-close>지금 마감(판정)</button>
                    </form>
                  )}
                  {r.status === "failed" && (
                    <form action={cancelAllGroupBuyAction.bind(null, store.slug, r.id)}>
                      <button className="rounded bg-red-600 px-3 py-1 text-xs text-white" data-group-buy-cancel-all>미달 주문 일괄 취소·환불</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </AdminShell>
  );
}
