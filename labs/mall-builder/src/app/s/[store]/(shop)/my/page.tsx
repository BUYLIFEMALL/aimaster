import Link from "next/link";
import { redirect } from "next/navigation";
import { getCreditLedger, getMyAddresses, getMyCustomer, getStoreBySlug, requireUser, type CustomerAddress } from "@/lib/store";
import CreditLedger from "@/app/credit-ledger";
import DeleteButton from "../../admin/categories/delete-button";
import LogoutButton from "@/app/logout-button";
import { APPROVAL_LABEL } from "@/lib/business";
import BusinessForm from "./business-form";
import { deleteAddressAction, leaveStoreAction, makeDefaultAddressAction, saveAddressAction, updateProfileAction } from "./actions";

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
      <label className="block">
        <span className="text-xs text-gray-500">우편번호</span>
        <input name="zip" defaultValue={address?.zip ?? ""} required inputMode="numeric" maxLength={5} placeholder="06236" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs text-gray-500">주소</span>
        <input name="addr1" defaultValue={address?.addr1 ?? ""} required maxLength={120} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs text-gray-500">상세 주소</span>
        <input name="addr2" defaultValue={address?.addr2 ?? ""} maxLength={120} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      {!address?.is_default && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="is_default" /> 기본 배송지로
        </label>
      )}
      <button className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white sm:w-32">{address ? "저장" : "배송지 추가"}</button>
    </form>
  );
}

export default async function MyPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { store: slug } = await params;
  const { error, ok } = await searchParams;
  const user = await requireUser(`/s/${slug}/my`);
  const store = await getStoreBySlug(slug);
  const customer = await getMyCustomer(store.id, user.id);
  if (!customer) redirect(`/s/${slug}/join?next=${encodeURIComponent(`/s/${slug}/my`)}`);
  const addresses = await getMyAddresses(customer.id);
  const credit = customer.credit_limit > 0 ? await getCreditLedger(customer.id) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">마이페이지</h1>
        <div className="flex items-center gap-2">
          <Link href={`/s/${store.slug}/orders`} className="flex min-h-11 items-center rounded border px-3 text-sm">주문 내역</Link>
          <Link href={`/s/${store.slug}/quotes`} className="flex min-h-11 items-center rounded border px-3 text-sm">견적 내역</Link>
          <LogoutButton label="로그아웃" />
        </div>
      </div>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</p>}

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
            <p className="mb-2 text-sm font-medium">외상(후불)</p>
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

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">배송지 ({addresses.length})</h2>
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
