import Link from "next/link";
import { redirect } from "next/navigation";
import { getCart, getCreditLedger, getCurrentUser, getMyAddresses, getMyCustomer, getPriceContexts, getShippingPolicies, getStoreBySlug, requireUser, type Store } from "@/lib/store";
import { guestOrderEnabled } from "@/lib/guest";
import { loadGuestCart } from "@/lib/guest-store";
import GuestOrderForm from "./guest-order-form";
import { cartTotals, priceLine } from "@/lib/pricing";
import { regionOfZip, type Region } from "@/lib/shipping";
import { formatWon } from "@/lib/products";
import { readBusinessInfo } from "@/lib/businessInfo";
import { createClient } from "@/lib/supabase/server";
import OrderForm from "./order-form";
import { getMyCoupons, getPointBalance, getPointSettings, getProductCategoryMap, usableCoupons } from "@/lib/benefits-store";
import { couponLabel } from "@/lib/benefits";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 비회원 주문서(D15)
async function GuestOrderPage({ store }: { store: Store }) {
  const base = `/s/${store.slug}`;
  const [rows, policies] = await Promise.all([loadGuestCart(store.id, store.slug), getShippingPolicies(store.id)]);
  const ctxOf = await getPriceContexts(store.id, rows.map((r) => r.product.id));
  const lines = rows.map((r) => ({ ...r, price: priceLine(r.product, r.variant, r.qty, ctxOf(r.product.id)) }));
  if (!lines.length || lines.some((l) => !l.price.orderable)) redirect(`${base}/cart`);
  const shipLines = lines.map((l) => ({ lineTotal: l.price.lineTotal, policyId: l.product.shipping_policy_id, orderable: true }));
  const totalsByRegion = Object.fromEntries(
    (["mainland", "jeju", "island"] as Region[]).map((r) => {
      const t = cartTotals(shipLines, policies, r);
      return [r, { subtotal: t.subtotal, shipping: t.shipping, total: t.total }];
    }),
  ) as Record<Region, { subtotal: number; shipping: number; total: number }>;
  const info = readBusinessInfo(store.business_info);
  const bankText =
    info.bank_name && info.bank_account
      ? `${info.bank_name} ${info.bank_account}${info.bank_holder ? ` (예금주 ${info.bank_holder})` : ""} — 주문 후 입금해 주세요.`
      : "입금 계좌는 주문 후 안내됩니다.";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 border-b border-slate-200/80 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Checkout</span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          주문서 <span className="text-sm font-normal text-slate-500">(비회원)</span>
        </h1>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-3">주문 상품 ({lines.length}건)</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {lines.map((l) => (
            <li key={l.index} className="flex justify-between gap-4 py-3" data-order-line>
              <span className="text-slate-800">
                <span className="font-semibold">{l.product.name}</span>
                {l.variant && <span className="text-slate-500"> · {l.variant.key}</span>} × {l.qty}
              </span>
              <b className="font-bold text-slate-900">{formatWon(l.price.lineTotal)}</b>
            </li>
          ))}
        </ul>
        <Link href={`${base}/cart`} className="mt-4 inline-block text-xs font-semibold text-blue-600 underline">
          ← 장바구니로 돌아가기
        </Link>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <GuestOrderForm
          slug={store.slug}
          totalsByRegion={totalsByRegion}
          bankText={bankText}
          loginHref={`/login?next=${encodeURIComponent(`${base}/cart`)}`}
        />
      </div>
    </main>
  );
}

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 주문서
export default async function OrderPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const base = `/s/${slug}`;
  const store = await getStoreBySlug(slug);
  if (!(await getCurrentUser()) && guestOrderEnabled(store.settings)) return <GuestOrderPage store={store} />;
  const user = await requireUser(`${base}/order`);
  const customer = await getMyCustomer(store.id, user.id);
  if (!customer) redirect(`${base}/join?next=${encodeURIComponent(`${base}/order`)}`);
  const [rows, policies, addresses] = await Promise.all([getCart(store.id, user.id), getShippingPolicies(store.id), getMyAddresses(customer.id)]);
  const ctxOf = await getPriceContexts(store.id, rows.map((r) => r.product.id));
  const lines = rows.map((r) => ({ ...r, price: priceLine(r.product, r.variant, r.qty, ctxOf(r.product.id)) }));
  // 비었거나 주문할 수 없는 줄이 있으면 장바구니에서 먼저 정리
  if (!lines.length || lines.some((l) => !l.price.orderable)) redirect(`${base}/cart`);

  const shipLines = lines.map((l) => ({ lineTotal: l.price.lineTotal, policyId: l.product.shipping_policy_id, orderable: true }));
  const totalsByRegion = Object.fromEntries(
    (["mainland", "jeju", "island"] as Region[]).map((r) => {
      const t = cartTotals(shipLines, policies, r);
      return [r, { subtotal: t.subtotal, shipping: t.shipping, total: t.total }];
    }),
  ) as Record<Region, { subtotal: number; shipping: number; total: number }>;
  const info = readBusinessInfo(store.business_info);
  // 카드 결제: 몰이 켰고 클라이언트 키가 있을 때만(시크릿 키 여부는 DB 함수가 주문 때 다시 검사)
  const { data: pay } = await (await createClient()).from("mall_builder_store_payment_settings").select("toss_client_key, card_enabled").eq("store_id", store.id).maybeSingle();
  const card = Boolean(pay?.card_enabled && pay.toss_client_key);
  // 외상: 승인 사업자이고 한도가 있을 때만 결제 방법에 보인다(DB 함수가 한 번 더 검사)
  const isBusiness = customer.approval_status === "approved" && !!customer.grade?.is_business;
  const credit = isBusiness && customer.credit_limit > 0 ? { limit: customer.credit_limit, balance: (await getCreditLedger(customer.id)).balance } : undefined;
  // 쿠폰·포인트(D17·D18) — 장바구니 주문에만. 실제 할인은 DB 함수가 다시 계산
  const [issues, pointSettings, pointBalance, catMap] = await Promise.all([
    getMyCoupons(customer.id),
    getPointSettings(store.id),
    getPointBalance(customer.id),
    getProductCategoryMap(lines.map((l) => l.product.id)),
  ]);
  const benefits = {
    coupons: usableCoupons(issues).map((i) => ({ issueId: i.id, name: i.coupon.name, label: couponLabel(i.coupon), expiresAt: i.expires_at, coupon: i.coupon })),
    lines: lines.map((l) => ({ productId: l.product.id, categoryIds: catMap.get(l.product.id) ?? [], lineTotal: l.price.lineTotal })),
    isBusiness,
    points: pointSettings.enabled ? { settings: pointSettings, balance: pointBalance } : null,
    gradeRate: customer.grade?.point_rate != null ? Number(customer.grade.point_rate) : null,
  };
  const bankText =
    info.bank_name && info.bank_account
      ? `${info.bank_name} ${info.bank_account}${info.bank_holder ? ` (예금주 ${info.bank_holder})` : ""} — 주문 후 입금해 주세요.`
      : "입금 계좌는 주문 후 안내됩니다. (운영자가 아직 계좌를 등록하지 않았습니다)";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 border-b border-slate-200/80 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Checkout</span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">주문서</h1>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-3">주문 상품 ({lines.length}건)</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-4 py-3" data-order-line>
              <span className="text-slate-800">
                <span className="font-semibold">{l.product.name}</span>
                {l.variant && <span className="text-slate-500"> · {l.variant.key}</span>} × {l.qty}
              </span>
              <b className="font-bold text-slate-900">{formatWon(l.price.lineTotal)}</b>
            </li>
          ))}
        </ul>
        <Link href={`${base}/cart`} className="mt-4 inline-block text-xs font-semibold text-blue-600 underline">
          ← 장바구니로 돌아가기
        </Link>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-xs">
          <p className="font-bold text-base">등록된 배송지가 없습니다.</p>
          <p className="mt-1 text-xs">주문을 진행하려면 먼저 마이페이지에서 배송지를 등록해 주세요.</p>
          <Link href={`${base}/my`} className="mt-4 inline-block btn-3d-blue px-4 py-2 text-xs">
            마이페이지에서 배송지 추가하기
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <OrderForm
            slug={store.slug}
            addresses={addresses}
            regionOf={Object.fromEntries(addresses.map((a) => [a.id, regionOfZip(a.zip)]))}
            totalsByRegion={totalsByRegion}
            defaultDepositor={customer.name}
            bankText={bankText}
            credit={credit}
            invoice={isBusiness ? { defaultEmail: user.email ?? "" } : undefined}
            card={card}
            benefits={benefits}
          />
        </div>
      )}
    </main>
  );
}
