import Link from "next/link";
import { getQuotes, getStoreBySlug, requireUser } from "@/lib/store";
import { QUOTE_STATUS_LABEL, displayStatus } from "@/lib/quotes";
import { formatDateTime } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function QuotesPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const user = await requireUser(`/s/${slug}/quotes`);
  const store = await getStoreBySlug(slug);
  const quotes = await getQuotes(store.id, user.id);
  const base = `/s/${store.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">견적 내역</h1>
      <p className="mt-1 text-sm text-gray-500">장바구니에서 「견적 요청」을 누르면 담긴 상품으로 견적을 받을 수 있습니다.</p>
      {quotes.length === 0 ? (
        <p className="mt-8 rounded border border-dashed p-8 text-center text-gray-500">견적 요청이 없습니다.</p>
      ) : (
        <ul className="mt-6 divide-y border-y">
          {quotes.map((q) => (
            <li key={q.id} data-quote-row>
              <Link href={`${base}/quotes/${q.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4 hover:bg-gray-50">
                <span className="text-sm text-gray-500">{formatDateTime(q.created_at)}</span>
                <span className="text-sm">{q.quote_no}</span>
                <span className="min-w-0 flex-1 truncate">
                  {q.first_item}
                  {q.item_count > 1 && ` 외 ${q.item_count - 1}건`}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{QUOTE_STATUS_LABEL[displayStatus(q.status, q.valid_until)]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
