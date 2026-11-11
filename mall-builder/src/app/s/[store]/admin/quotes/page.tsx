import Link from "next/link";
import { getQuotes, getStaffStore } from "@/lib/store";
import { QUOTE_ORIGIN_LABEL, QUOTE_STATUS_LABEL, displayStatus } from "@/lib/quotes";
import { formatDateTime } from "@/lib/orders";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminQuotesPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/quotes`);
  if (!staff) return <NoPermission />;
  const quotes = await getQuotes(store.id);
  // 회신할 것(요청)을 먼저
  const sorted = [...quotes].sort((a, b) => Number(b.status === "requested") - Number(a.status === "requested"));
  const waiting = quotes.filter((q) => q.status === "requested").length;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/quotes">
      <p className="text-sm text-gray-600" data-quote-summary>견적 {quotes.length}건 · 회신 기다림 <b>{waiting}</b>건</p>
      {sorted.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">견적이 없습니다. 손님 상세 화면의 「견적 보내기」로 먼저 보낼 수도 있습니다.</p>
      ) : (
        <ul className="mt-4 divide-y border-y text-sm">
          {sorted.map((q) => (
            <li key={q.id} data-admin-quote>
              <Link href={`/s/${store.slug}/admin/quotes/${q.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-gray-50">
                <span className="text-gray-500">{formatDateTime(q.created_at)}</span>
                <span>{q.quote_no}</span>
                <span className="min-w-0 flex-1 truncate">
                  {q.customer?.company ?? q.customer?.name} · {q.first_item}
                  {q.item_count > 1 && ` 외 ${q.item_count - 1}건`}
                </span>
                {q.origin === "staff" && <span className="text-xs text-gray-500">{QUOTE_ORIGIN_LABEL.staff}</span>}
                <span className={`rounded px-2 py-0.5 text-xs ${q.status === "requested" ? "bg-amber-100 text-amber-800" : "bg-gray-100"}`}>
                  {QUOTE_STATUS_LABEL[displayStatus(q.status, q.valid_until)]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
