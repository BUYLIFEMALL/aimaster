import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplierProduct, getSupplierVariants } from "@/lib/supplier-store";
import { APPROVAL_LABEL } from "@/lib/supplier";
import { getSupplierContext, NotSupplier, SupplierShell } from "../../supplier-shell";
import SupplierProductForm from "../product-form";
import OptionsEditor from "../../../admin/products/[id]/options-editor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D35 공급사 상품 고치기 · T1(0060) 옵션
export default async function SupplierProductEditPage({ params, searchParams }: { params: Promise<{ store: string; id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { store: slug, id } = await params;
  const notice = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier/products/${id}`);
  const product = me ? await getSupplierProduct(me.id, id) : null;
  if (me && !product) notFound();
  const opts = product ? await getSupplierVariants(product.id) : { variants: [], groups: [] };
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
          {/* T1(0060) 옵션 — 추가 공급가를 적으면 운영자가 승인 때 판매 추가금을 정함(기본값 = 마진 비율) */}
          <div className="mt-8" data-supplier-options>
            <OptionsEditor
              slug={store.slug}
              productId={product.id}
              basePrice={product.base_price}
              stockByOption={product.stock_mode === "product"}
              initialGroups={opts.groups}
              initialVariants={opts.variants.map((v) => ({ ...v, extra_price: v.extra_supply }))}
              mode="supplier"
            />
          </div>
        </>
      )}
    </SupplierShell>
  );
}
