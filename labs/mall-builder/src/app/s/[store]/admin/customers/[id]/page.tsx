import Link from "next/link";
import { notFound } from "next/navigation";
import { getCertUrl, getCreditLedger, getStaffStore, getStoreCustomer } from "@/lib/store";
import CreditLedger from "@/app/credit-ledger";
import { APPROVAL_LABEL } from "@/lib/business";
import { formatDateTime } from "@/lib/orders";
import { AdminShell, NoPermission } from "../../admin-shell";
import { creditEntryAction, reviewBusinessAction, setCreditLimitAction } from "../actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { store: slug, id } = await params;
  const { error, ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/customers/${id}`);
  if (!staff) return <NoPermission />;
  const c = await getStoreCustomer(store.id, id);
  if (!c) notFound();
  const [certUrl, ledger] = await Promise.all([getCertUrl(c.cert_path), getCreditLedger(c.id)]);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/customers">
      <Link href={`/s/${store.slug}/admin/customers`} className="text-sm text-gray-500">← 손님 목록</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">{c.name}</h2>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-approval>{APPROVAL_LABEL[c.approval_status]}</span>
        {c.grade && <span className="text-sm text-gray-500" data-grade>등급 {c.grade.name}</span>}
      </div>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-review-error>{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{ok === "approved" ? "승인했습니다." : ok === "rejected" ? "반려했습니다." : ok === "credit" ? "외상 한도를 저장했습니다." : "장부에 기록했습니다."}</p>}

      <section className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded border p-4">
          <p className="font-medium">손님 정보</p>
          <p className="mt-1">휴대폰 {c.phone}</p>
          <p>가입 {formatDateTime(c.created_at)}</p>
          <p>소식 수신 {c.marketing_agree ? "동의" : "안 함"}</p>
        </div>
        <div className="rounded border p-4">
          <p className="font-medium">사업자 정보</p>
          {c.business_no ? (
            <>
              <p className="mt-1">{c.company} · 대표 {c.ceo_name}</p>
              <p>사업자등록번호 {c.business_no}</p>
              {c.applied_at && <p>신청 {formatDateTime(c.applied_at)}</p>}
              {c.reviewed_at && <p>심사 {formatDateTime(c.reviewed_at)}</p>}
              {c.reject_reason && <p className="text-red-700">반려 사유: {c.reject_reason}</p>}
              {certUrl && (
                <a href={certUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-blue-700 underline" data-cert-link>
                  사업자등록증 보기(10분 동안 열림)
                </a>
              )}
            </>
          ) : (
            <p className="mt-1 text-gray-500">사업자 신청이 없습니다.</p>
          )}
        </div>
      </section>

      {c.approval_status === "approved" && (
        <section className="mt-6 space-y-4 rounded-lg border p-4" data-credit-admin>
          <h3 className="text-sm font-semibold">외상(후불)</h3>
          <CreditLedger limit={c.credit_limit} balance={ledger.balance} entries={ledger.entries} />
          <form action={setCreditLimitAction.bind(null, store.slug, c.id)} className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs text-gray-500">외상 한도(원, 0 = 외상 안 씀)</span>
              <input name="credit_limit" defaultValue={c.credit_limit ? String(c.credit_limit) : ""} inputMode="numeric" className="mt-0.5 w-40 rounded border px-2 py-1.5 text-sm" />
            </label>
            <button className="min-h-10 rounded border px-4 text-sm">한도 저장</button>
          </form>
          <form action={creditEntryAction.bind(null, store.slug, c.id)} className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs text-gray-500">구분</span>
              <select name="kind" className="mt-0.5 block rounded border px-2 py-1.5 text-sm">
                <option value="payment">입금(사용 금액 줄이기)</option>
                <option value="adjust">조정(+/−, 사유 필수)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">금액(원)</span>
              <input name="amount" inputMode="numeric" placeholder="입금 50000 / 조정 -3000" className="mt-0.5 w-40 rounded border px-2 py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">메모</span>
              <input name="note" maxLength={200} className="mt-0.5 w-56 rounded border px-2 py-1.5 text-sm" />
            </label>
            <button className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white">장부에 기록</button>
          </form>
        </section>
      )}

      {c.approval_status === "pending" && (
        <section className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border p-4" data-review>
          <form action={reviewBusinessAction.bind(null, store.slug, c.id, true)}>
            <button className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white">승인(사업자 등급으로)</button>
          </form>
          <form action={reviewBusinessAction.bind(null, store.slug, c.id, false)} className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs text-gray-500">반려 사유(손님에게 보입니다)</span>
              <input name="reason" maxLength={200} className="mt-0.5 w-64 rounded border px-2 py-1.5 text-sm" />
            </label>
            <button className="min-h-10 rounded border border-red-200 px-4 text-sm text-red-700">반려</button>
          </form>
        </section>
      )}
    </AdminShell>
  );
}
