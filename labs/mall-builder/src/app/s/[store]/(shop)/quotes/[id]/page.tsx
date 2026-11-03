import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyAddresses, getMyCustomer, getQuote, getShippingPolicies, getStoreBySlug, requireUser } from "@/lib/store";
import { QUOTE_STATUS_LABEL, displayStatus } from "@/lib/quotes";
import { cartTotals } from "@/lib/pricing";
import { regionOfZip, type Region } from "@/lib/shipping";
import { formatDateTime } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { readBusinessInfo } from "@/lib/businessInfo";
import { createClient } from "@/lib/supabase/server";
import DeleteButton from "../../../admin/categories/delete-button";
import OrderForm from "../../order/order-form";
import { orderFromQuoteAction, rejectQuoteAction } from "../actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ requested?: string; error?: string }>;
}) {
  const { store: slug, id } = await params;
  const { requested, error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await requireUser(`/s/${slug}/quotes/${id}`);
  const store = await getStoreBySlug(slug);
  const found = await getQuote(store.id, id);
  if (!found || found.quote.user_id !== user.id) notFound();
  const { quote, items } = found;
  const status = displayStatus(quote.status, quote.valid_until);
  const base = `/s/${store.slug}`;
  const canOrder = status === "answered";

  let orderBlock = null;
  if (canOrder) {
    const customer = await getMyCustomer(store.id, user.id);
    const [addresses, policies] = await Promise.all([customer ? getMyAddresses(customer.id) : Promise.resolve([]), getShippingPolicies(store.id)]);
    // 배송비 정책은 상품에서 — 견적가 합계로 정책 묶음별 계산(주문 DB 함수와 같은 방식)
    const supabase = await createClient();
    const ids = items.map((i) => i.product_id).filter((x): x is string => !!x);
    const { data: prods } = ids.length ? await supabase.from("mall_builder_products").select("id, shipping_policy_id").in("id", ids) : { data: [] };
    const policyOf = new Map((prods ?? []).map((p) => [p.id as string, p.shipping_policy_id as string | null]));
    const lines = items.map((i) => ({ lineTotal: (i.quoted_price ?? 0) * i.qty, policyId: i.product_id ? policyOf.get(i.product_id) ?? null : null, orderable: true }));
    const totalsByRegion = Object.fromEntries(
      (["mainland", "jeju", "island"] as Region[]).map((r) => {
        const t = cartTotals(lines, policies, r);
        return [r, { subtotal: t.subtotal, shipping: t.shipping, total: t.total }];
      }),
    ) as Record<Region, { subtotal: number; shipping: number; total: number }>;
    const info = readBusinessInfo(store.business_info);
    orderBlock =
      addresses.length === 0 ? (
        <p className="mt-6 rounded bg-amber-50 px-3 py-3 text-sm">
          배송지가 없습니다. <Link href={`${base}/my`} className="underline">마이페이지에서 배송지를 먼저 추가</Link>해 주세요.
        </p>
      ) : (
        <OrderForm
          slug={store.slug}
          addresses={addresses}
          regionOf={Object.fromEntries(addresses.map((a) => [a.id, regionOfZip(a.zip)]))}
          totalsByRegion={totalsByRegion}
          defaultDepositor={customer?.name ?? ""}
          bankText={info.bank_name && info.bank_account ? `${info.bank_name} ${info.bank_account}${info.bank_holder ? ` (예금주 ${info.bank_holder})` : ""}` : "입금 계좌는 주문 후 안내됩니다."}
          action={orderFromQuoteAction.bind(null, store.slug, quote.id)}
          note="견적가 그대로 주문합니다. 장바구니는 그대로 남습니다. 입금이 확인되면 배송을 준비합니다."
        />
      );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {requested && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800">견적을 요청했습니다. 운영자가 회신하면 이 화면에서 견적가를 확인하고 바로 주문할 수 있습니다.</p>}
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">견적 {quote.quote_no}</h1>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-quote-status>{QUOTE_STATUS_LABEL[status]}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {formatDateTime(quote.created_at)} 요청
        {quote.valid_until && ` · 유효기한 ${quote.valid_until}까지`}
      </p>
      {quote.request_note && <p className="mt-3 text-sm text-gray-700">요청 메모: {quote.request_note}</p>}

      <ul className="mt-6 divide-y border-y text-sm" data-quote-items>
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap justify-between gap-2 py-3">
            <span>
              {i.name_snapshot}
              {i.option_snapshot && <span className="text-gray-500"> · {i.option_snapshot}</span>} × {i.qty}
            </span>
            {i.quoted_price != null ? (
              <span>
                견적가 <b>{formatWon(i.quoted_price)}</b>
                {i.ref_unit_price != null && i.ref_unit_price > i.quoted_price && (
                  <span className="ml-1 text-xs text-gray-400 line-through">{formatWon(i.ref_unit_price)}</span>
                )}{" "}
                = <b>{formatWon(i.quoted_price * i.qty)}</b>
              </span>
            ) : (
              <span className="text-gray-500">회신 대기</span>
            )}
          </li>
        ))}
      </ul>
      {quote.answer_note && <p className="mt-3 rounded bg-gray-50 px-3 py-2 text-sm">운영자 메모: {quote.answer_note}</p>}

      {status === "expired" && <p className="mt-6 rounded bg-amber-50 px-3 py-2 text-sm" data-quote-expired>유효기한이 지난 견적입니다. 장바구니에서 다시 요청해 주세요.</p>}
      {quote.status === "accepted" && quote.order_id && (
        <p className="mt-6 text-sm">
          이 견적으로 주문했습니다. <Link href={`${base}/orders/${quote.order_id}`} className="underline">주문 보기</Link>
        </p>
      )}
      {orderBlock}
      {(quote.status === "requested" || quote.status === "answered") && (
        <div className="mt-6">
          <DeleteButton name={quote.quote_no} label="견적 거절" message={`견적 ${quote.quote_no}을(를) 거절할까요?`} action={rejectQuoteAction.bind(null, store.slug, quote.id)} />
        </div>
      )}
      <Link href={`${base}/quotes`} className="mt-6 inline-block text-sm underline">견적 내역 전체</Link>
    </main>
  );
}
