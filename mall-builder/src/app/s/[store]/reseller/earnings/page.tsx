import Link from "next/link";
import { getMyRewards, getPayouts, getResellerLedger } from "@/lib/reseller-store";
import { LEDGER_KIND_LABEL, PAYOUT_STATUS_LABEL } from "@/lib/reseller";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";
import { ResellerShell, getResellerContext } from "../reseller-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STATUS = { pending: "지급 예정", paid: "지급 완료", held: "보류", deleted: "삭제" } as const;
const BADGE = { pending: "bg-amber-50 text-amber-800", paid: "bg-emerald-50 text-emerald-800", held: "bg-red-50 text-red-700", deleted: "bg-slate-100 text-slate-500" } as const;

// M4-C1 수익 — 품목별 리워드(상태별), 적립·출금 장부, 출금 내역
export default async function ResellerEarningsPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ status?: string }> }) {
  const { store: slug } = await params;
  const { status } = await searchParams;
  const { user, store, summary: s } = await getResellerContext(slug, `/s/${slug}/reseller/earnings`);
  const [{ rows, sum }, ledger, payouts] = await Promise.all([getMyRewards(s.id, 300), getResellerLedger(s.id, 50), getPayouts(store.id, s.id, 30)]);
  const st = (Object.keys(STATUS) as (keyof typeof STATUS)[]).find((k) => k === status);
  const list = st ? rows.filter((w) => w.status === st) : rows;
  const base = `/s/${store.slug}/reseller/earnings`;
  return (
    <ResellerShell slug={store.slug} storeName={store.name} code={s.code} email={user.email ?? ""} active="/earnings">
      <h1 className="text-xl font-bold">💰 수익</h1>
      <nav className="mt-3 flex flex-wrap gap-1 text-xs" data-earn-filter>
        <Link href={base} className={`rounded-full border px-3 py-1.5 ${!st ? "bg-slate-900 text-white" : "bg-white"}`}>전체 {rows.length}</Link>
        {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) => (
          <Link key={k} href={`${base}?status=${k}`} className={`rounded-full border px-3 py-1.5 ${st === k ? "bg-slate-900 text-white" : "bg-white"}`}>{STATUS[k]} {formatWon(sum[k])}</Link>
        ))}
      </nav>
      <section className="mt-3" data-my-rewards>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">아직 리워드가 없습니다. 상품 링크를 올려 보세요.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((w) => (
              <li key={w.id} className="flex items-start justify-between gap-2 rounded-xl border bg-white p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{w.name_snapshot}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(w.created_at)} · 주문 {w.order?.order_no ?? ""} · {formatWon(w.base_amount)} × {w.product_rate + w.reseller_rate}%</p>
                  {w.note && <p className="text-xs text-slate-500">{w.note}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{formatWon(w.amount)}</p>
                  <span className={`rounded px-1.5 text-xs ${BADGE[w.status]}`}>{STATUS[w.status]}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-3 text-xs" data-my-ledger>
          <h2 className="text-sm font-semibold">적립·출금 장부 <span className="font-normal text-slate-500">잔액 {formatWon(s.balance)}</span></h2>
          <ul className="mt-2 space-y-0.5">
            {ledger.map((l) => (
              <li key={l.id}>{formatDateTime(l.created_at)} · {LEDGER_KIND_LABEL[l.kind]} <b className={l.amount < 0 ? "text-red-600" : "text-emerald-700"}>{l.amount > 0 ? "+" : ""}{l.amount.toLocaleString("ko-KR")}원</b> · 잔액 {l.balance_after.toLocaleString("ko-KR")}원{l.note && ` · ${l.note}`}</li>
            ))}
            {ledger.length === 0 && <li className="text-slate-500">기록이 없습니다.</li>}
          </ul>
        </section>
        <section className="rounded-xl border bg-white p-3 text-xs" data-my-payouts>
          <h2 className="text-sm font-semibold">출금 내역</h2>
          <ul className="mt-2 space-y-0.5">
            {payouts.map((p) => (
              <li key={p.id}>{formatDateTime(p.requested_at)} · {formatWon(p.amount)} · <b>{PAYOUT_STATUS_LABEL[p.status]}</b>{p.status === "paid" && p.transfer_amount != null && ` (공제 ${formatWon(p.deduction ?? 0)} → 이체 ${formatWon(p.transfer_amount)})`}{p.reason && ` — ${p.reason}`}</li>
            ))}
            {payouts.length === 0 && <li className="text-slate-500">출금 신청이 없습니다.</li>}
          </ul>
        </section>
      </div>
    </ResellerShell>
  );
}
