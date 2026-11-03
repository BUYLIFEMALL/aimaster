import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuote, getStaffStore } from "@/lib/store";
import { QUOTE_ORIGIN_LABEL, QUOTE_STATUS_LABEL, addDays, displayStatus, todayKst } from "@/lib/quotes";
import { formatDateTime } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { AdminShell, NoPermission } from "../../admin-shell";
import { answerQuoteAction } from "../actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { store: slug, id } = await params;
  const { error, ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/quotes/${id}`);
  if (!staff) return <NoPermission />;
  const found = await getQuote(store.id, id);
  if (!found) notFound();
  const { quote, items } = found;
  const status = displayStatus(quote.status, quote.valid_until);
  const editable = quote.status === "requested" || quote.status === "answered";

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/quotes">
      <Link href={`/s/${store.slug}/admin/quotes`} className="text-sm text-gray-500">← 견적 목록</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">견적 {quote.quote_no}</h2>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-quote-status>{QUOTE_STATUS_LABEL[status]}</span>
        <span className="text-sm text-gray-500">{formatDateTime(quote.created_at)} · {quote.customer?.company ?? quote.customer?.name}</span>
      </div>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-answer-error>{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700" data-quote-ok>{ok === "sent" ? "견적을 보냈습니다." : "회신했습니다."} 손님이 견적가로 바로 주문할 수 있습니다.</p>}
      {quote.origin === "staff" && <p className="mt-2 text-xs text-gray-500" data-quote-origin>{QUOTE_ORIGIN_LABEL.staff} 견적</p>}
      {quote.request_note && <p className="mt-4 rounded bg-gray-50 px-3 py-2 text-sm">손님 메모: {quote.request_note}</p>}

      <form action={answerQuoteAction.bind(null, store.slug, quote.id)} className="mt-6 space-y-4" data-answer-form>
        <ul className="divide-y border-y text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
              <input type="hidden" name="item_id" value={i.id} />
              <span className="min-w-0 flex-1">
                {i.name_snapshot}
                {i.option_snapshot && <span className="text-gray-500"> · {i.option_snapshot}</span>} × {i.qty}
                {i.ref_unit_price != null && <span className="block text-xs text-gray-500">요청 때 판매가 {formatWon(i.ref_unit_price)}</span>}
              </span>
              <label className="flex items-center gap-1">
                <span className="text-xs text-gray-500">견적 단가</span>
                <input
                  name={`price_${i.id}`}
                  defaultValue={i.quoted_price != null ? String(i.quoted_price) : ""}
                  disabled={!editable}
                  inputMode="numeric"
                  className="w-28 rounded border px-2 py-1.5"
                />
                원
              </label>
            </li>
          ))}
        </ul>
        {editable && (
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs text-gray-500">유효기한(그날까지)</span>
              <input type="date" name="valid_until" defaultValue={quote.valid_until ?? addDays(todayKst(), 7)} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-gray-500">회신 메모(손님에게 보임)</span>
              <input name="note" defaultValue={quote.answer_note} maxLength={500} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
            </label>
            <button className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white sm:w-40">{quote.status === "answered" ? "다시 회신" : "회신 보내기"}</button>
          </div>
        )}
      </form>
      {quote.order_id && (
        <p className="mt-6 text-sm">
          손님이 이 견적으로 주문했습니다. <Link href={`/s/${store.slug}/admin/orders/${quote.order_id}`} className="underline">주문 보기</Link>
        </p>
      )}
    </AdminShell>
  );
}
