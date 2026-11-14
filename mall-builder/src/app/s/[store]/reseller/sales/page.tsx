import Link from "next/link";
import { getMyLinks, getMyRewards, getMySales } from "@/lib/reseller-store";
import { getShopProducts } from "@/lib/store";
import { REF_SOURCE_LABEL, rankProducts } from "@/lib/reseller";
import { ORDER_STATUS_LABEL, formatDateTime, type OrderStatus } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { ResellerShell, getResellerContext } from "../reseller-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TABS = [
  { id: "orders", label: "판매 내역" },
  { id: "rank", label: "상품 순위" },
  { id: "links", label: "링크 성과" },
] as const;
const LIVE = new Set(["paid", "preparing", "shipping", "delivered", "confirmed"]);

// M4-C3 판매 — 내 링크로 들어온 주문(유저 개인정보 없이, 0078), 상품 순위(내 리워드 기준), 짧은 링크 누른 수
export default async function ResellerSalesPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { store: slug } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.id === rawTab)?.id ?? "orders";
  const { user, store, summary: s } = await getResellerContext(slug, `/s/${slug}/reseller/sales`);
  const [sales, { rows: rewards }, links, products] = await Promise.all([getMySales(store.id, 300), getMyRewards(s.id, 500), getMyLinks(s.id), getShopProducts(store.id, { limit: 300 })]);
  const live = sales.rows.filter((o) => LIVE.has(o.status));
  const total = { orders: live.length, sales: live.reduce((a, o) => a + o.items_total, 0), reward: sales.rows.reduce((a, o) => a + o.reward, 0) };
  const ranking = rankProducts(rewards);
  const nameOf = new Map(products.map((p) => [p.id, p.name]));
  const linkRows = [...links.entries()].map(([pid, l]) => ({ ...l, name: pid === "home" ? "몰 첫 화면" : nameOf.get(pid) ?? "(판매 끝난 상품)" })).sort((a, b) => b.clicks - a.clicks);
  const base = `/s/${store.slug}/reseller/sales`;
  const card = "rounded-xl border bg-white p-3";
  return (
    <ResellerShell slug={store.slug} storeName={store.name} code={s.code} email={user.email ?? ""} active="/sales">
      <h1 className="text-xl font-bold">📈 판매</h1>
      {!sales.ready && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">판매 내역은 DB 업데이트 뒤에 보입니다.</p>}
      <section className="mt-3 grid grid-cols-3 gap-2" data-sales-total>
        <div className={card}><p className="text-xs text-slate-500">결제된 주문</p><p className="mt-1 text-lg font-bold">{total.orders.toLocaleString("ko-KR")}건</p></div>
        <div className={card}><p className="text-xs text-slate-500">판매 금액</p><p className="mt-1 text-lg font-bold">{formatWon(total.sales)}</p></div>
        <div className={card}><p className="text-xs text-slate-500">내 리워드</p><p className="mt-1 text-lg font-bold text-emerald-700">{formatWon(total.reward)}</p></div>
      </section>
      <nav className="mt-4 flex gap-1 text-xs" data-sales-tabs>
        {TABS.map((t) => (
          <Link key={t.id} href={`${base}?tab=${t.id}`} className={`rounded-full border px-3 py-1.5 ${tab === t.id ? "bg-slate-900 text-white" : "bg-white"}`}>{t.label}</Link>
        ))}
      </nav>

      {tab === "orders" && (
        <section className="mt-3" data-sales-orders>
          {sales.rows.length === 0 ? (
            <p className="text-sm text-slate-500">아직 내 링크로 들어온 주문이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {sales.rows.map((o) => (
                <li key={o.order_id} className="flex items-start justify-between gap-2 rounded-xl border bg-white p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.first_item}{o.item_count > 1 && ` 외 ${o.item_count - 1}개`}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(o.created_at)} · 주문 {o.order_no} · {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}{o.ref_source && ` · ${REF_SOURCE_LABEL[o.ref_source]}`}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatWon(o.items_total)}</p>
                    <p className="text-xs text-emerald-700">리워드 {formatWon(o.reward)}</p>
                    {o.reward_pending > 0 && <p className="text-[11px] text-amber-700">지급 예정 {formatWon(o.reward_pending)}</p>}
                    {o.reward_held > 0 && <p className="text-[11px] text-red-700">보류 {formatWon(o.reward_held)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">유저 이름·연락처·주소는 보이지 않습니다. 리워드는 결제가 확인된 뒤 생기고, 입금 대기 주문은 0원으로 보입니다.</p>
        </section>
      )}

      {tab === "rank" && (
        <section className="mt-3" data-sales-rank>
          {ranking.length === 0 ? (
            <p className="text-sm text-slate-500">아직 리워드가 생긴 상품이 없습니다.</p>
          ) : (
            <ol className="space-y-2">
              {ranking.map((r, i) => (
                <li key={r.key} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm">
                  <span className={`w-6 text-center font-bold ${i < 3 ? "text-amber-600" : "text-slate-400"}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="shrink-0 text-right text-xs text-slate-500">주문 {r.orders}건 · {formatWon(r.sales)}<br /><b className="text-emerald-700">리워드 {formatWon(r.reward)}</b></span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {tab === "links" && (
        <section className="mt-3" data-sales-links>
          {linkRows.length === 0 ? (
            <p className="text-sm text-slate-500">아직 만든 짧은 링크가 없습니다. <Link href={`/s/${store.slug}/reseller/products`} className="underline">상품 고르기</Link>에서 「짧은 링크」를 눌러 보세요.</p>
          ) : (
            <ul className="space-y-1">
              {linkRows.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{l.name} <span className="font-mono text-xs text-slate-400">/l/{l.key}</span></span>
                  <b className="shrink-0">{l.clicks.toLocaleString("ko-KR")}번 열림</b>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">짧은 링크(짧은 링크를 만든 뒤의 QR 포함)로 들어온 수만 셉니다. 긴 링크로 바로 들어온 수는 빠집니다. 같은 사람이 여러 번 눌러도 모두 셉니다.</p>
        </section>
      )}
    </ResellerShell>
  );
}
