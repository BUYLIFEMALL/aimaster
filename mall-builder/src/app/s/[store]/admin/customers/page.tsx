import Link from "next/link";
import { getCustomerCounts, getStaffStore, getStoreCustomerPage } from "@/lib/store";
import { APPROVAL_LABEL } from "@/lib/business";
import { AdminShell, NoPermission } from "../admin-shell";
import { MEMBER_STATUS_LABEL, readClosed } from "@/lib/closed";
import { APPROVAL_TABS, MEMBER_TABS, customerListHref, customerPageCount, parseCustomerListQuery } from "@/lib/customer-list";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { store: slug } = await params;
  const f = parseCustomerListQuery(await searchParams); // M2-8: 탭·검색어·가입일·페이지
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/customers`);
  if (!staff) return <NoPermission />;
  const [{ rows: customers, total: found }, counts] = await Promise.all([getStoreCustomerPage(store.id, f), getCustomerCounts(store.id)]);
  // 폐쇄몰(D20) 입장 대기·반려
  const closed = readClosed(store.settings);
  const base = `/s/${store.slug}/admin/customers`;
  const pages = customerPageCount(found);
  const narrowed = Boolean(f.q || f.from || f.to);
  const tab = { approval: undefined, member: undefined, page: 1 };

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/customers">
      <nav className="flex flex-wrap gap-1 text-sm" data-customer-tabs>
        <Link href={customerListHref(base, f, tab)} className={`rounded px-3 py-1.5 ${!f.approval && !f.member ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체 {counts.all}</Link>
        {MEMBER_TABS.map((m) => {
          const n = counts.member[m];
          return n || (closed.enabled && m === "pending") ? (
            <Link key={m} href={customerListHref(base, f, { ...tab, member: m })} className={`rounded px-3 py-1.5 ${f.member === m ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800"}`} data-member-tab={m}>
              {MEMBER_STATUS_LABEL[m]} {n}
            </Link>
          ) : null;
        })}
        {APPROVAL_TABS.map((t) => {
          const n = counts.approval[t];
          return n ? (
            <Link key={t} href={customerListHref(base, f, { ...tab, approval: t })} className={`rounded px-3 py-1.5 ${f.approval === t ? "bg-gray-900 text-white" : "bg-gray-100"}`}>
              {APPROVAL_LABEL[t]} {n}
            </Link>
          ) : null;
        })}
      </nav>

      <form method="get" action={base} className="mt-3 flex flex-wrap items-end gap-2 text-sm" data-customer-search>
        {f.member && <input type="hidden" name="member" value={f.member} />}
        {!f.member && f.approval && <input type="hidden" name="approval" value={f.approval} />}
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">검색</span>
          <input name="q" defaultValue={f.q} maxLength={40} placeholder="이름·휴대폰·상호·사업자번호" className="w-60 rounded border px-2 py-1.5" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">가입일 부터</span>
          <input type="date" name="from" defaultValue={f.from} className="rounded border px-2 py-1.5" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">까지</span>
          <input type="date" name="to" defaultValue={f.to} className="rounded border px-2 py-1.5" />
        </label>
        <button className="rounded bg-gray-900 px-3 py-1.5 text-white">찾기</button>
        {narrowed && (
          <Link href={customerListHref(base, { ...f, q: "", from: undefined, to: undefined }, { page: 1 })} className="py-1.5 text-gray-500 underline">
            조건 지우기
          </Link>
        )}
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-600" data-customer-found>{narrowed || f.approval || f.member ? `찾은 유저 ${found}명` : `유저 ${found}명`}</span>
        <a href={customerListHref(`${base}/excel`, f, { page: 1 })} className="text-blue-700 underline" data-customer-excel>
          ⬇ 지금 조건으로 엑셀 내려받기
        </a>
        <span className="text-xs text-gray-400">최대 5,000명 · 내려받을 때마다 열람 기록이 남습니다</span>
      </div>

      {customers.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">{narrowed ? "조건에 맞는 유저가 없습니다." : "유저가 없습니다."}</p>
      ) : (
        <ul className="mt-4 divide-y border-y text-sm">
          {customers.map((c) => (
            <li key={c.id} data-customer-row>
              <Link href={`${base}/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-gray-50">
                <b>{c.name}</b>
                <span className="text-gray-500">{c.phone}</span>
                <span className="min-w-0 flex-1 truncate text-gray-600">{c.company ? `${c.company} · ${c.business_no}` : ""}</span>
                <span className="text-xs text-gray-500">{c.grade?.name}</span>
                {c.member_status !== "approved" && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800" data-member-badge>{MEMBER_STATUS_LABEL[c.member_status]}</span>}
                <span className={`rounded px-2 py-0.5 text-xs ${c.approval_status === "pending" ? "bg-amber-100 text-amber-800" : "bg-gray-100"}`}>
                  {APPROVAL_LABEL[c.approval_status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm" data-customer-pages>
          {f.page > 1 ? <Link href={customerListHref(base, f, { page: f.page - 1 })} className="rounded bg-gray-100 px-3 py-1.5">‹ 이전</Link> : <span className="px-3 py-1.5 text-gray-300">‹ 이전</span>}
          <span className="text-gray-600">
            {f.page} / {pages}
          </span>
          {f.page < pages ? <Link href={customerListHref(base, f, { page: f.page + 1 })} className="rounded bg-gray-100 px-3 py-1.5">다음 ›</Link> : <span className="px-3 py-1.5 text-gray-300">다음 ›</span>}
        </nav>
      )}
    </AdminShell>
  );
}
