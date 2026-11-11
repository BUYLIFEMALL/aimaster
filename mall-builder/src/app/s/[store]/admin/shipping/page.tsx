import { getShippingPolicies, getStaffStore } from "@/lib/store";
import { SHIPPING_TYPE_LABEL, describePolicy, type ShippingPolicy } from "@/lib/shipping";
import { AdminShell, NoPermission } from "../admin-shell";
import DeleteButton from "../categories/delete-button";
import { deletePolicyAction, makeDefaultAction, savePolicyAction } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function PolicyForm({ slug, policy }: { slug: string; policy: ShippingPolicy | null }) {
  const v = (n: number | null | undefined) => (n ? String(n) : "");
  return (
    <form action={savePolicyAction.bind(null, slug, policy?.id ?? null)} className="grid gap-2 sm:grid-cols-3">
      <label className="block sm:col-span-1">
        <span className="text-xs text-gray-500">정책 이름</span>
        <input name="name" defaultValue={policy?.name ?? ""} required maxLength={30} placeholder="예: 기본 배송" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">종류</span>
        <select name="type" defaultValue={policy?.type ?? "conditional"} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm">
          {Object.entries(SHIPPING_TYPE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">기본 배송비(원)</span>
        <input name="base_fee" defaultValue={v(policy?.base_fee)} inputMode="numeric" placeholder="3000" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">무료 기준(원 이상, 조건부)</span>
        <input name="free_over" defaultValue={v(policy?.free_over)} inputMode="numeric" placeholder="50000" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">제주 추가(원)</span>
        <input name="jeju_fee" defaultValue={v(policy?.jeju_fee)} inputMode="numeric" placeholder="3000" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">도서산간 추가(원)</span>
        <input name="island_fee" defaultValue={v(policy?.island_fee)} inputMode="numeric" placeholder="5000" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <button className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white sm:col-span-3 sm:w-32">{policy ? "저장" : "정책 추가"}</button>
    </form>
  );
}

export default async function ShippingPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { store: slug } = await params;
  const { error } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/shipping`);
  if (!staff) return <NoPermission />;
  const policies = await getShippingPolicies(store.id);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/shipping">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <p className="text-sm text-gray-600">
        상품마다 배송비 정책을 고를 수 있고, 고르지 않은 상품은 <b>기본 정책</b>을 씁니다. 같은 정책 상품끼리 묶어 묶음마다 한 번 매기며, 조건부 무료는 묶음 합계로 판단합니다. 제주·도서산간은 주문 주소의 우편번호로 판단합니다.
      </p>
      {policies.length === 0 && (
        <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm">아직 배송비 정책이 없어 모든 상품이 무료 배송으로 계산됩니다. 첫 정책을 만들면 자동으로 기본이 됩니다.</p>
      )}

      <ul className="mt-6 space-y-4">
        {policies.map((p) => (
          <li key={p.id} className="rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <b>{p.name}</b>
              {p.is_default && <span className="rounded bg-gray-900 px-2 py-0.5 text-xs text-white">기본</span>}
              <span className="text-xs text-gray-500">{describePolicy(p)}</span>
              <div className="ml-auto flex gap-1">
                {!p.is_default && (
                  <form action={makeDefaultAction.bind(null, store.slug, p.id)}>
                    <button className="rounded border px-2 py-1 text-xs">기본으로</button>
                  </form>
                )}
                {!p.is_default && <DeleteButton name={p.name} noun="배송비 정책" action={deletePolicyAction.bind(null, store.slug, p.id)} />}
              </div>
            </div>
            <PolicyForm slug={store.slug} policy={p} />
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-lg border border-dashed p-4">
        <h3 className="mb-3 text-sm font-semibold">새 배송비 정책</h3>
        <PolicyForm slug={store.slug} policy={null} />
      </section>
    </AdminShell>
  );
}
