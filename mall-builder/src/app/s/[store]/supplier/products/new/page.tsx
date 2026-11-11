import Link from "next/link";
import { getSupplierContext, NotSupplier, SupplierShell } from "../../supplier-shell";
import SupplierProductForm from "../product-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D35 공급사 상품 올리기
export default async function SupplierProductNewPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string }> }) {
  const { store: slug } = await params;
  const notice = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier/products/new`);
  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="/products" notice={notice}>
      {!me ? (
        <NotSupplier />
      ) : me.status !== "active" ? (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">쉬는 중에는 상품을 올릴 수 없습니다.</p>
      ) : (
        <>
          <Link href={`/s/${store.slug}/supplier/products`} className="text-sm text-gray-500">← 내 상품</Link>
          <h2 className="mb-4 mt-2 text-lg font-semibold">상품 올리기</h2>
          <SupplierProductForm slug={store.slug} storeId={store.id} supplierId={me.id} product={null} />
        </>
      )}
    </SupplierShell>
  );
}
