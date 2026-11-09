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

// 주문서 — 장바구니 전체를 무통장 입금으로 주문. 금액은 같은 가격 엔진으로 보여 주고, 실제 금액은 DB 함수가 다시 계산한다
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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">주문서</h1>
      <ul className="mt-6 divide-y border-y text-sm">
        {lines.map((l) => (
          <li key={l.id} className="flex justify-between gap-4 py-3" data-order-line>
            <span>
              {l.product.name}
              {l.variant && <span className="text-gray-500"> · {l.variant.key}</span>} × {l.qty}
            </span>
            <b>{formatWon(l.price.lineTotal)}</b>
          </li>
        ))}
      </ul>
      <Link href={`${base}/cart`} className="mt-2 inline-block text-sm underline">장바구니로 돌아가기</Link>

      {addresses.length === 0 ? (
        <p className="mt-6 rounded bg-amber-50 px-3 py-3 text-sm">
          배송지가 없습니다. <Link href={`${base}/my`} className="underline">마이페이지에서 배송지를 먼저 추가</Link>해 주세요.
        </p>
      ) : (
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
      )}
    </main>
  );
}

// 비회원 주문서(D15) — 쿠키 장바구니를 같은 가격 엔진으로(보는 사람 = 비회원), 지역별 합계는 미리 계산해 주소에 맞춰 바꾼다
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
  const bankText = info.bank_name && info.bank_account
    ? `${info.bank_name} ${info.bank_account}${info.bank_holder ? ` (예금주 ${info.bank_holder})` : ""} — 주문 후 입금해 주세요.`
    : "입금 계좌는 주문 후 안내됩니다.";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">주문서 <span className="text-sm font-normal text-gray-500">(비회원)</span></h1>
      <ul className="mt-6 divide-y border-y text-sm">
        {lines.map((l) => (
          <li key={l.index} className="flex justify-between gap-4 py-3" data-order-line>
            <span>{l.product.name}{l.variant && <span className="text-gray-500"> · {l.variant.key}</span>} × {l.qty}</span>
            <b>{formatWon(l.price.lineTotal)}</b>
          </li>
        ))}
      </ul>
      <Link href={`${base}/cart`} className="mt-2 inline-block text-sm underline">장바구니로 돌아가기</Link>
      <GuestOrderForm slug={store.slug} totalsByRegion={totalsByRegion} bankText={bankText} loginHref={`/login?next=${encodeURIComponent(`${base}/cart`)}`} />
    </main>
  );
}
