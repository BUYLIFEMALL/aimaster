import Link from "next/link";
import { updateSupplierSelfAction } from "@/lib/supplier-actions";
import { SUPPLIER_STATUS_LABEL } from "@/lib/supplier";
import { formatDateTime } from "@/lib/orders";
import { getSupplierContext, NotSupplier, SupplierShell } from "./supplier-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D34 공급사 화면 — 공급사 본인만. 내 정보·담당자 저장, D35 「내 상품」, 다음 단계 「내 주문」(D36)·「정산」(D37)
export default async function SupplierHomePage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const notice = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier`);

  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="" notice={notice}>
      {!me ? (
        <NotSupplier />
      ) : (
        <>
          <section className="rounded-lg border p-4 text-sm" data-supplier-me>
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-base">{me.name}</b>
              <span className={`rounded px-1.5 text-xs ${me.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{SUPPLIER_STATUS_LABEL[me.status]}</span>
              {me.accepted_at && <span className="ml-auto text-xs text-gray-400">{formatDateTime(me.accepted_at)} 입점</span>}
            </div>
            {me.status === "paused" && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">운영자가 잠시 쉬게 해 두었습니다. 그동안 내 상품은 판매되지 않고 새 주문도 들어오지 않습니다.</p>}
            <p className="mt-2 text-xs text-gray-500">사업자등록번호 {me.biz_no || "—"} · 상호·사업자번호를 바꾸려면 몰 운영자에게 요청해 주세요.</p>
            <form action={updateSupplierSelfAction.bind(null, store.slug)} className="mt-3 flex flex-wrap items-end gap-2" data-supplier-self>
              <input name="contact_name" maxLength={30} defaultValue={me.contact_name} placeholder="담당자" className="rounded border px-2 py-2" />
              <input name="phone" maxLength={30} defaultValue={me.phone} placeholder="연락처" className="rounded border px-2 py-2" />
              <button className="min-h-11 rounded border px-3 py-2">담당자 저장</button>
            </form>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-3" data-supplier-menu>
            <Link href={`/s/${store.slug}/supplier/products`} className="rounded border p-3 text-sm hover:bg-gray-50">
              <p className="font-semibold">📦 내 상품</p>
              <p className="mt-1 text-xs text-gray-500">상품을 올리면 운영자가 확인한 뒤 판매합니다.</p>
            </Link>
            <Link href={`/s/${store.slug}/supplier/orders`} className="rounded border p-3 text-sm hover:bg-gray-50">
              <p className="font-semibold">🚚 내 주문</p>
              <p className="mt-1 text-xs text-gray-500">내 상품이 팔리면 받는 사람·주소를 보고 송장을 입력합니다.</p>
            </Link>
            <Link href={`/s/${store.slug}/supplier/settlements`} className="rounded border p-3 text-sm hover:bg-gray-50">
              <p className="font-semibold">💰 정산</p>
              <p className="mt-1 text-xs text-gray-500">구매 확정된 품목의 공급가가 쌓이고 운영자가 송금합니다.</p>
            </Link>
          </section>
        </>
      )}
    </SupplierShell>
  );
}
