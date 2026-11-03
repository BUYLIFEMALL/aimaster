import Link from "next/link";
import { redirect } from "next/navigation";
import { getCart, getMyAddresses, getMyCustomer, getShippingPolicies, getStoreBySlug, requireUser } from "@/lib/store";
import { cartTotals, priceLine, MAX_QTY } from "@/lib/pricing";
import { regionOfZip } from "@/lib/shipping";
import { formatWon } from "@/lib/products";
import DeleteButton from "../../admin/categories/delete-button";
import { removeItemAction, updateQtyAction } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const REGION_LABEL = { mainland: "", jeju: " (제주)", island: " (도서산간)" } as const;

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { store: slug } = await params;
  const { error } = await searchParams;
  const user = await requireUser(`/s/${slug}/cart`);
  const store = await getStoreBySlug(slug);
  const customer = await getMyCustomer(store.id, user.id);
  if (!customer) redirect(`/s/${slug}/join?next=${encodeURIComponent(`/s/${slug}/cart`)}`);
  const [rows, policies, addresses] = await Promise.all([getCart(store.id, user.id), getShippingPolicies(store.id), getMyAddresses(customer.id)]);

  // 금액은 저장하지 않고 매번 가격 엔진으로 계산(상세 화면과 같은 함수)
  const lines = rows.map((r) => ({ ...r, price: priceLine(r.product, r.variant, r.qty) }));
  const address = addresses.find((a) => a.is_default) ?? null;
  const region = address ? regionOfZip(address.zip) : "mainland";
  const totals = cartTotals(
    lines.map((l) => ({ lineTotal: l.price.lineTotal, policyId: l.product.shipping_policy_id, orderable: l.price.orderable })),
    policies,
    region,
  );
  const blocked = lines.filter((l) => !l.price.orderable).length;
  const base = `/s/${store.slug}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-bold">장바구니</h1>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {lines.length === 0 ? (
        <p className="mt-8 rounded border border-dashed p-8 text-center text-gray-500">
          장바구니가 비어 있습니다. <Link href={base} className="underline">상품 보러 가기</Link>
        </p>
      ) : (
        <>
          <ul className="mt-6 divide-y border-y">
            {lines.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-4 py-4" data-cart-line>
                <Link href={`${base}/p/${l.product.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded bg-gray-100">
                  {l.product.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.product.images[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`${base}/p/${l.product.id}`} className="font-medium">{l.product.name}</Link>
                  {l.variant && <p className="text-sm text-gray-500">{l.variant.key}</p>}
                  <p className="text-sm text-gray-500">{formatWon(l.price.unitPrice)}</p>
                  {l.price.errors.map((e) => (
                    <p key={e} className="text-sm text-red-600">{e}</p>
                  ))}
                </div>
                <form action={updateQtyAction.bind(null, store.slug, l.id)} className="flex items-center gap-1">
                  <input name="qty" type="number" min={1} max={MAX_QTY} defaultValue={l.qty} aria-label="수량" className="w-20 rounded border px-2 py-1.5 text-sm" />
                  <button className="rounded border px-2 py-1.5 text-xs">변경</button>
                </form>
                <b className="w-28 text-right" data-line-total>{formatWon(l.price.lineTotal)}</b>
                <DeleteButton name={l.product.name} noun="상품" label="빼기" message={`「${l.product.name}」을(를) 장바구니에서 뺄까요?`} action={removeItemAction.bind(null, store.slug, l.id)} />
              </li>
            ))}
          </ul>

          <section className="ml-auto mt-6 max-w-sm space-y-2 text-sm" data-cart-totals>
            <p className="flex justify-between"><span>상품 금액</span><span>{formatWon(totals.subtotal)}</span></p>
            {totals.shippingBreakdown.map((b) => (
              <p key={b.policyId ?? "none"} className="flex justify-between text-gray-600">
                <span>배송비 · {b.name}{REGION_LABEL[region]}</span>
                <span>{formatWon(b.fee)}</span>
              </p>
            ))}
            <p className="flex justify-between border-t pt-2 text-lg font-bold"><span>결제 예정 금액</span><span>{formatWon(totals.total)}</span></p>
            <p className="text-xs text-gray-500">
              {address ? `기본 배송지(${address.label}, ${address.zip}) 기준 배송비입니다.` : "배송지를 등록하면 제주·도서산간 배송비가 반영됩니다."}
              {blocked > 0 && ` 주문할 수 없는 상품 ${blocked}개는 금액에서 뺐습니다.`}
            </p>
            {blocked > 0 ? (
              <p className="rounded bg-amber-50 px-3 py-2 text-amber-800">주문할 수 없는 상품을 빼거나 수량을 고친 뒤 주문해 주세요.</p>
            ) : (
              <Link href={`${base}/order`} className="flex min-h-12 w-full items-center justify-center rounded bg-gray-900 text-white" data-checkout>
                주문하기
              </Link>
            )}
          </section>
        </>
      )}
    </main>
  );
}
