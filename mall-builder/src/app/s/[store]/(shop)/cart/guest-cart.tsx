import Link from "next/link";
import { getPriceContexts, getShippingPolicies, type Store } from "@/lib/store";
import { cartTotals, priceLine, MAX_QTY } from "@/lib/pricing";
import { formatWon } from "@/lib/products";
import { loadGuestCart } from "@/lib/guest-store";
import DeleteButton from "../../admin/categories/delete-button";
import { removeGuestLineAction, updateGuestQtyAction } from "./actions";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 비회원 장바구니
export default async function GuestCart({ store, error }: { store: Store; error?: string }) {
  const [rows, policies] = await Promise.all([loadGuestCart(store.id, store.slug), getShippingPolicies(store.id)]);
  const ctxOf = await getPriceContexts(store.id, rows.map((r) => r.product.id));
  const lines = rows.map((r) => ({ ...r, price: priceLine(r.product, r.variant, r.qty, ctxOf(r.product.id)) }));
  const totals = cartTotals(lines.map((l) => ({ lineTotal: l.price.lineTotal, policyId: l.product.shipping_policy_id, orderable: l.price.orderable, qty: l.qty, productId: l.product.id })), policies, "mainland");
  const blocked = lines.filter((l) => !l.price.orderable).length;
  const base = `/s/${store.slug}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" data-guest-cart>
      <div className="mb-6 border-b border-slate-200/80 pb-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">장바구니</h1>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">비회원</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          로그인하지 않고 담은 상품입니다. 회원이시면{" "}
          <Link href={`/login?next=${encodeURIComponent(`${base}/cart`)}`} className="font-semibold text-blue-600 underline">
            로그인
          </Link>
          해 주세요 (비회원 장바구니는 회원 장바구니로 옮겨지지 않습니다).
        </p>
      </div>

      {error && <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {lines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-xs">
          <p className="text-4xl text-slate-300">🛒</p>
          <p className="mt-3 text-base font-bold text-slate-700">장바구니가 비어 있습니다.</p>
          <Link href={base} className="mt-4 inline-block btn-3d-blue px-5 py-2.5 text-xs">
            상품 보러 가기
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
              <ul className="divide-y divide-slate-100">
                {lines.map((l) => (
                  <li key={l.index} className="flex flex-wrap items-center gap-4 p-4 sm:p-5 hover:bg-slate-50/50 transition-colors" data-cart-line>
                    <Link href={`${base}/p/${l.product.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-2xs">
                      {l.product.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.product.images[0].url} alt="" className="h-full w-full object-cover" />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`${base}/p/${l.product.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                        {l.product.name}
                      </Link>
                      {l.variant && <p className="mt-0.5 text-xs font-semibold text-slate-500">옵션: {l.variant.key}</p>}
                      <p className="mt-1 text-xs font-bold text-slate-700">{formatWon(l.price.unitPrice)}</p>
                      {l.price.errors.map((e) => (
                        <p key={e} className="mt-0.5 text-xs font-semibold text-rose-600">{e}</p>
                      ))}
                    </div>

                    <form action={updateGuestQtyAction.bind(null, store.slug, l.index)} className="flex items-center gap-1.5">
                      <input
                        name="qty"
                        type="number"
                        min={1}
                        max={MAX_QTY}
                        defaultValue={l.qty}
                        aria-label="수량"
                        className="w-18 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                      />
                      <button className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        변경
                      </button>
                    </form>

                    <div className="text-right">
                      <b className="block text-base font-black text-slate-900" data-line-total>
                        {formatWon(l.price.lineTotal)}
                      </b>
                      <div className="mt-1">
                        <DeleteButton
                          name={l.product.name}
                          noun="상품"
                          label="삭제"
                          message={`「${l.product.name}」을(를) 장바구니에서 뺄까요?`}
                          action={removeGuestLineAction.bind(null, store.slug, l.index)}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs" data-cart-totals>
              <h2 className="text-base font-black text-slate-900 mb-4 pb-3 border-b border-slate-100">주문 요약</h2>
              <div className="space-y-2.5 text-sm">
                <p className="flex justify-between text-slate-600">
                  <span>상품 금액</span>
                  <span className="font-bold text-slate-900">{formatWon(totals.subtotal)}</span>
                </p>
                <p className="flex justify-between text-slate-500 text-xs">
                  <span>배송비 (기본 지역)</span>
                  <span className="font-semibold text-slate-700">{formatWon(totals.shipping)}</span>
                </p>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900">결제 예정 금액</span>
                  <span className="text-2xl font-black text-blue-600">{formatWon(totals.total)}</span>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                제주·도서산간은 주문서에서 주소를 넣으면 배송비가 다시 계산됩니다.
                {blocked > 0 && ` 주문할 수 없는 상품 ${blocked}개는 금액에서 뺐습니다.`}
              </p>

              <div className="mt-6">
                {blocked > 0 ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    주문할 수 없는 상품을 빼거나 수량을 고친 뒤 주문해 주세요.
                  </p>
                ) : (
                  <Link
                    href={`${base}/order`}
                    className="flex min-h-13 w-full items-center justify-center btn-3d-blue text-base font-bold shadow-md"
                    data-checkout
                  >
                    비회원으로 주문하기
                  </Link>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
