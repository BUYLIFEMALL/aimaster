import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplierProduct } from "@/lib/supplier-store";
import { APPROVAL_LABEL } from "@/lib/supplier";
import { getSupplierContext, NotSupplier, SupplierShell } from "../../supplier-shell";
import SupplierProductForm from "../product-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D35 공급사 상품 고치기
export default async function SupplierProductEditPage({ params, searchParams }: { params: Promise<{ store: string; id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { store: slug, id } = await params;
  const notice = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier/products/${id}`);
  const product = me ? await getSupplierProduct(me.id, id) : null;
  if (me && !product) notFound();
  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="/products" notice={notice}>
      {!me || !product ? (
        <NotSupplier />
      ) : (
        <>
          <Link href={`/s/${store.slug}/supplier/products`} className="text-sm text-gray-500">← 내 상품</Link>
          <h2 className="mt-2 text-lg font-semibold">{product.name} <span className="ml-1 text-sm font-normal text-gray-500">{APPROVAL_LABEL[product.approval]}</span></h2>
          {product.approval === "rejected" && product.approval_note && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">반려 사유: {product.approval_note} — 고쳐서 저장하면 다시 승인 요청됩니다.</p>}
          <div className="mt-4"><SupplierProductForm slug={store.slug} storeId={store.id} supplierId={me.id} product={product} /></div>
        </>
      )}
    </SupplierShell>
  );
}
