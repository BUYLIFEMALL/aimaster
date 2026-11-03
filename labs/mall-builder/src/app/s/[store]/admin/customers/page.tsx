import Link from "next/link";
import { getStaffStore, getStoreCustomers } from "@/lib/store";
import { APPROVAL_LABEL, type ApprovalStatus } from "@/lib/business";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TABS: ApprovalStatus[] = ["pending", "approved", "rejected", "none"];

export default async function AdminCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ approval?: string }>;
}) {
  const { store: slug } = await params;
  const { approval } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/customers`);
  if (!staff) return <NoPermission />;
  const filter = TABS.includes(approval as ApprovalStatus) ? (approval as ApprovalStatus) : undefined;
  const all = await getStoreCustomers(store.id);
  const customers = filter ? all.filter((c) => c.approval_status === filter) : all;
  const base = `/s/${store.slug}/admin/customers`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/customers">
      <nav className="flex flex-wrap gap-1 text-sm" data-customer-tabs>
        <Link href={base} className={`rounded px-3 py-1.5 ${!filter ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체 {all.length}</Link>
        {TABS.map((t) => {
          const n = all.filter((c) => c.approval_status === t).length;
          return n ? (
            <Link key={t} href={`${base}?approval=${t}`} className={`rounded px-3 py-1.5 ${filter === t ? "bg-gray-900 text-white" : "bg-gray-100"}`}>
              {APPROVAL_LABEL[t]} {n}
            </Link>
          ) : null;
        })}
      </nav>
      {customers.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">손님이 없습니다.</p>
      ) : (
        <ul className="mt-4 divide-y border-y text-sm">
          {customers.map((c) => (
            <li key={c.id} data-customer-row>
              <Link href={`${base}/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-gray-50">
                <b>{c.name}</b>
                <span className="text-gray-500">{c.phone}</span>
                <span className="min-w-0 flex-1 truncate text-gray-600">{c.company ? `${c.company} · ${c.business_no}` : ""}</span>
                <span className="text-xs text-gray-500">{c.grade?.name}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${c.approval_status === "pending" ? "bg-amber-100 text-amber-800" : "bg-gray-100"}`}>
                  {APPROVAL_LABEL[c.approval_status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
