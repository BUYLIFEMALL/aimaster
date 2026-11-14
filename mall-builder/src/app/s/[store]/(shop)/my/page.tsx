import PendingButton from "@/app/pending-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCreditLedger, getMyAddresses, getMyCustomer, getStoreBySlug, requireUser, type CustomerAddress } from "@/lib/store";
import CreditLedger from "@/app/credit-ledger";
import DeleteButton from "../../admin/categories/delete-button";
import LogoutButton from "@/app/logout-button";
import { APPROVAL_LABEL } from "@/lib/business";
import BusinessForm from "./business-form";
import AddressFields from "./address-fields";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/orders";
import { RESTOCK_SELECT, RESTOCK_STATUS_LABEL, restockLabel, type RestockRow } from "@/lib/restock";
import { cancelRestockAction } from "@/lib/restock-actions";
import { deleteAddressAction, leaveStoreAction, makeDefaultAddressAction, saveAddressAction, updateProfileAction, applyInviteCodeAction } from "./actions";
import { expiringSoon, getMyCoupons, getPointBalance, getPointLedger, getPointSettings } from "@/lib/benefits-store";
import { couponLabel, POINT_KIND_LABEL } from "@/lib/benefits";
import { redeemCouponAction } from "@/lib/benefit-actions";
import { readClosed } from "@/lib/closed";
import { headers } from "next/headers";
import { mallSlugFromHost } from "@/lib/host";
import { getMyResellerSummary, getPayouts, getResellerLedger } from "@/lib/reseller-store";
import ResellerPanel from "./reseller-panel";
import { resellerApplyOpen } from "@/lib/reseller-apply";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function AddressForm({ slug, address }: { slug: string; address: CustomerAddress | null }) {
  return (
    <form action={saveAddressAction.bind(null, slug, address?.id ?? null)} className="grid gap-2 sm:grid-cols-2">
      <label className="block">
        <span className="text-xs text-gray-500">배송지 이름</span>
        <input name="label" defaultValue={address?.label ?? ""} maxLength={20} placeholder="예: 회사" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">받는 분</span>
        <input name="receiver" defaultValue={address?.receiver ?? ""} required maxLength={30} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">휴대폰</span>
        <input name="phone" defaultValue={address?.phone ?? ""} required inputMode="tel" placeholder="010-1234-5678" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <AddressFields zip={address?.zip ?? ""} addr1={address?.addr1 ?? ""} />
      <label className="block sm:col-span-2">
        <span className="text-xs text-gray-500">상세 주소</span>
        <input name="addr2" defaultValue={address?.addr2 ?? ""} maxLength={120} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      {!address?.is_default && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="is_default" /> 기본 배송지로
        </label>
      )}
      <PendingButton pendingText="저장 중…" className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white sm:w-32">{address ? "저장" : "배송지 추가"}</PendingButton>
    </form>
  );
}

export default async function MyPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ error?: string; ok?: string; at?: string }>;
}) {
  const { store: slug } = await params;
  const { error, ok, at } = await searchParams;
  const atAddresses = at === "addresses"; // 배송지 동작의 알림은 배송지 칸에서 보인다
  const user = await requireUser(`/s/${slug}/my`);
  const store = await getStoreBySlug(slug);
  const customer = await getMyCustomer(store.id, user.id);
  if (!customer) redirect(`/s/${slug}/join?next=${encodeURIComponent(`/s/${slug}/my`)}`);
  const addresses = await getMyAddresses(customer.id);
  const credit = customer.credit_limit > 0 ? await getCreditLedger(customer.id) : null;
  // 내 재입고 알림 신청(D16) — 보안 규칙이 내 것만 돌려준다
  const supabase = await createClient();
  const { data: restockData } = await supabase
    .from("mall_builder_restock_requests")
    .select(RESTOCK_SELECT)
    .eq("store_id", store.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const restocks = (restockData ?? []) as unknown as RestockRow[];
  // 쿠폰·포인트(D17·D18)
  const [coupons, pointSettings, pointBalance, pointLedger] = await Promise.all([
    getMyCoupons(customer.id),
    getPointSettings(store.id),
    getPointBalance(customer.id),
    getPointLedger(customer.id, 30),
  ]);
  const now = Date.now();
  const usable = coupons.filter((i) => !i.used_at && i.coupon.is_active && (!i.expires_at || Date.parse(i.expires_at) > now));
  const soon = expiringSoon(pointLedger, now);
  const [birthM, birthD] = (customer.birth_md ?? "-").split("-");
  // D33 리셀러로 지정된 손님에게만 리셀러 칸 — 링크는 지금 접속한 주소 기준(하위 도메인이면 그 주소)
  const reseller = await getMyResellerSummary(store.id);
  const [rLedger, rPayouts] = reseller ? await Promise.all([getResellerLedger(reseller.id, 30), getPayouts(store.id, reseller.id, 20)]) : [[], []];
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const onSub = mallSlugFromHost(host, process.env.MALL_ROOT_DOMAIN) === store.slug;
  const refLink = reseller ? `${proto}://${host}${onSub ? "/" : `/s/${store.slug}`}?ref=${reseller.code}` : "";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">마이페이지</h1>
        <div className="flex items-center gap-2">
          <Link href={`/s/${store.slug}/orders`} className="flex min-h-11 items-center rounded border px-3 text-sm">주문 내역</Link>
          <Link href={`/s/${store.slug}/quotes`} className="flex min-h-11 items-center rounded border px-3 text-sm">견적 내역</Link>
          <Link href={`/s/${store.slug}/my/recurring`} className="flex min-h-11 items-center rounded border px-3 text-sm" data-my-recurring>🔁 정기 주문</Link>
          <Link href={`/s/${store.slug}/inquiries`} className="flex min-h-11 items-center rounded border px-3 text-sm">1:1 문의</Link>
          <LogoutButton label="로그아웃" />
        </div>
      </div>
      {readClosed(store.settings).enabled && customer.member_status !== "approved" && (
        <section className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm" data-my-member-status>
          <p className="font-medium text-amber-900">
            {customer.member_status === "rejected"
              ? `입장이 반려되었습니다${customer.member_reject_reason ? ` — ${customer.member_reject_reason}` : ""}`
              : "입장 대기 중입니다. 운영자가 승인하면 상품을 보고 주문할 수 있습니다."}
          </p>
          {readClosed(store.settings).code && (
            <form action={applyInviteCodeAction.bind(null, store.slug)} className="mt-2 flex gap-2">
              <input name="invite_code" required maxLength={20} placeholder="초대 코드" className="w-40 rounded border px-2 py-1.5 uppercase" />
              <button className="rounded bg-gray-900 px-3 text-white">코드로 입장</button>
            </form>
          )}
        </section>
      )}
      {error && !atAddresses && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && !atAddresses && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</p>}

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">내 정보</h2>
        <p className="mb-3 text-xs text-gray-500">로그인 계정 {user.email} · {new Date(customer.created_at).toLocaleDateString("ko-KR")} 가입</p>
        <form action={updateProfileAction.bind(null, store.slug)} className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-gray-500">이름</span>
            <input name="name" defaultValue={customer.name} required maxLength={30} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">휴대폰</span>
            <input name="phone" defaultValue={customer.phone} required inputMode="tel" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">생일(선택 — 생일 쿠폰을 받습니다)</span>
            <span className="mt-0.5 flex gap-2">
              <select name="birth_m" defaultValue={birthM ? String(Number(birthM)) : ""} className="rounded border px-2 py-1.5 text-sm" data-birth-month>
                <option value="">월</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}월</option>)}
              </select>
              <select name="birth_d" defaultValue={birthD ? String(Number(birthD)) : ""} className="rounded border px-2 py-1.5 text-sm" data-birth-day>
                <option value="">일</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}일</option>)}
              </select>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="marketing_agree" defaultChecked={customer.marketing_agree} /> 할인·신상품 소식 받기
          </label>
          <button className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white sm:w-32">저장</button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border p-4" data-business-section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">사업자 회원</h2>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs" data-approval>{APPROVAL_LABEL[customer.approval_status]}</span>
          {customer.grade && <span className="text-xs text-gray-500">등급: {customer.grade.name}</span>}
        </div>
        {customer.approval_status === "approved" && (
          <p className="text-sm text-gray-700">
            {customer.company} · {customer.ceo_name} · {customer.business_no} — 사업자 가격·주문 기능을 쓸 수 있습니다.
          </p>
        )}
        {credit && (
          <div className="mt-4 border-t pt-3">
            <p className="mb-2 flex items-center text-sm font-medium">외상(후불)<a href={`/s/${slug}/doc/ledger/${customer.id}`} target="_blank" rel="noopener" className="ml-auto rounded border px-3 py-1 text-xs font-normal" data-ledger-link>📒 외상 원장</a></p>
            <CreditLedger limit={customer.credit_limit} balance={credit.balance} entries={credit.entries} />
          </div>
        )}
        {customer.approval_status === "pending" && (
          <p className="text-sm text-gray-700">
            {customer.company}({customer.business_no}) 신청을 운영자가 확인하고 있습니다.
            {customer.applied_at && ` 신청일 ${new Date(customer.applied_at).toLocaleDateString("ko-KR")}.`}
          </p>
        )}
        {(customer.approval_status === "none" || customer.approval_status === "rejected") && (
          <>
            {customer.approval_status === "rejected" && (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-reject-reason>
                반려 사유: {customer.reject_reason} — 고쳐서 다시 신청해 주세요.
              </p>
            )}
            {customer.approval_status === "none" && (
              <p className="mb-3 text-sm text-gray-600">사업자라면 등록증을 올려 승인 신청하세요. 승인되면 사업자 등급으로 바뀝니다.</p>
            )}
            <BusinessForm
              slug={store.slug}
              storeId={store.id}
              userId={user.id}
              initial={{ business_no: customer.business_no ?? "", company: customer.company ?? "", ceo_name: customer.ceo_name ?? "" }}
            />
          </>
        )}
      </section>

      {reseller && <ResellerPanel slug={store.slug} link={refLink} s={reseller} ledger={rLedger} payouts={rPayouts} />}
      {/* M1-4(0071) 리셀러가 아니고 몰이 신청을 받으면 신청 안내 */}
      {!reseller && resellerApplyOpen(store.modules) && (
        <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-gray-600" data-reseller-apply-link>
          🤝 내 채널로 상품을 알리고 수수료를 받아 보세요. <a href={`/s/${store.slug}/reseller/apply`} className="text-blue-700 underline">리셀러 신청하기 →</a>
        </p>
      )}

      <section className="mt-6 rounded-lg border p-4" data-my-coupons>
        <h2 className="mb-3 font-semibold">내 쿠폰 ({usable.length}장)</h2>
        <form action={redeemCouponAction.bind(null, store.slug)} className="mb-3 flex gap-2">
          <input name="code" maxLength={20} placeholder="쿠폰 코드 입력" className="w-48 rounded border px-2 py-1.5 text-sm uppercase" data-coupon-code />
          <button className="rounded border px-3 text-sm">등록</button>
        </form>
        {usable.length === 0 ? (
          <p className="text-sm text-gray-500">쓸 수 있는 쿠폰이 없습니다.</p>
        ) : (
          <ul className="divide-y rounded border text-sm">
            {usable.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <b>{i.coupon.name}</b>
                <span className="text-gray-600">{couponLabel(i.coupon)}</span>
                <span className="ml-auto text-xs text-gray-500">{i.expires_at ? `${new Date(i.expires_at).toLocaleDateString("ko-KR")}까지` : "기한 없음"}</span>
              </li>
            ))}
          </ul>
        )}
        {coupons.length > usable.length && (
          <p className="mt-2 text-xs text-gray-500">사용했거나 기간이 끝난 쿠폰 {coupons.length - usable.length}장</p>
        )}
      </section>

      {(pointSettings.enabled || pointBalance > 0 || pointLedger.length > 0) && (
        <section className="mt-6 rounded-lg border p-4" data-my-points>
          <h2 className="mb-1 font-semibold">포인트 <span className="ml-1" data-my-point-balance>{pointBalance.toLocaleString("ko-KR")}점</span></h2>
          {pointSettings.enabled && (
            <p className="text-xs text-gray-500">
              구매 확정 때 결제 금액의 {customer.grade?.point_rate ?? pointSettings.earn_rate}% 적립 · {pointSettings.min_use.toLocaleString("ko-KR")}점 이상 모이면 주문서에서 사용 · 적립 후 {pointSettings.expire_months}개월 뒤 소멸
            </p>
          )}
          {soon.points > 0 && (
            <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800" data-points-expiring>
              {soon.points.toLocaleString("ko-KR")}점이 {soon.first ? new Date(soon.first).toLocaleDateString("ko-KR") : "곧"} 소멸됩니다.
            </p>
          )}
          {pointLedger.length > 0 && (
            <ul className="mt-3 divide-y rounded border text-sm">
              {pointLedger.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-2 px-3 py-1.5">
                  <span className="w-12 text-xs text-gray-500">{POINT_KIND_LABEL[e.kind] ?? e.kind}</span>
                  <b className={e.amount < 0 ? "text-red-600" : ""}>{e.amount > 0 ? "+" : ""}{e.amount.toLocaleString("ko-KR")}</b>
                  <span className="flex-1 text-gray-600">{e.note}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section id="addresses" className="mt-6 scroll-mt-4">
        <h2 className="mb-3 font-semibold">배송지 ({addresses.length})</h2>
        {atAddresses && error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        {atAddresses && ok && <p className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700" role="status">{ok}</p>}
        <ul className="space-y-4">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-lg border p-4" data-address>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <b>{a.label}</b>
                {a.is_default && <span className="rounded bg-gray-900 px-2 py-0.5 text-xs text-white">기본</span>}
                <span className="text-xs text-gray-500">
                  {a.receiver} · {a.phone} · ({a.zip}) {a.addr1} {a.addr2}
                </span>
                <div className="ml-auto flex gap-1">
                  {!a.is_default && (
                    <form action={makeDefaultAddressAction.bind(null, store.slug, a.id)}>
                      <button className="rounded border px-2 py-1 text-xs">기본으로</button>
                    </form>
                  )}
                  <DeleteButton name={a.label} noun="배송지" action={deleteAddressAction.bind(null, store.slug, a.id)} />
                </div>
              </div>
              <AddressForm slug={store.slug} address={a} />
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-lg border border-dashed p-4">
          <h3 className="mb-3 text-sm font-semibold">새 배송지</h3>
          <AddressForm slug={store.slug} address={null} />
        </div>
      </section>

      {restocks.length > 0 && (
        <section className="mt-6" data-my-restock>
          <h2 className="mb-3 font-semibold">재입고 알림 신청 ({restocks.filter((r) => r.status === "waiting").length}건 대기)</h2>
          <ul className="divide-y rounded border text-sm">
            {restocks.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className={`rounded px-1.5 text-xs ${r.status === "waiting" ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-500"}`}>
                  {RESTOCK_STATUS_LABEL[r.status] ?? r.status}
                </span>
                <Link href={`/s/${store.slug}/p/${r.product_id}`} className="underline">{restockLabel(r)}</Link>
                <span className="text-xs text-gray-400">{formatDateTime(r.created_at)}</span>
                {r.status === "waiting" && (
                  <form action={cancelRestockAction.bind(null, store.slug, r.id, "my")} className="ml-auto">
                    <button className="rounded border px-2 py-1 text-xs">취소</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 border-t pt-4 text-sm text-gray-500">
        <p className="mb-2">이 몰에서만 탈퇴합니다. 로그인 계정과 다른 몰 가입 정보는 그대로 남습니다.</p>
        <DeleteButton
          name={store.name}
          label="이 몰 탈퇴"
          message={`「${store.name}」에서 탈퇴할까요? 이 몰의 내 정보와 배송지가 지워집니다.`}
          action={leaveStoreAction.bind(null, store.slug)}
        />
      </section>
    </main>
  );
}
