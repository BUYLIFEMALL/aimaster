import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryRows, getProductForEdit, getProductVariants, getStaffStore } from "@/lib/store";
import OptionsEditor from "./options-editor";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { AdminShell, NoPermission } from "../../admin-shell";
import ProductForm from "../product-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { store: slug, id } = await params;
  const { saved } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products/${id}`);
  if (!staff) return <NoPermission />;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const product = await getProductForEdit(store.id, id);
  if (!product) notFound();
  const [categoryRows, variants] = await Promise.all([getCategoryRows(store.id), getProductVariants(product.id)]);
  const categories = flattenTree(buildCategoryTree(categoryRows, true));
  const won = (n: number | null) => (n == null ? "" : String(n));

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">상품 수정</h2>
        <Link href={`/s/${store.slug}/admin/products`} className="text-sm text-gray-500">← 상품 목록</Link>
      </div>
      <ProductForm
        slug={store.slug}
        storeId={store.id}
        productId={product.id}
        categories={categories}
        savedNotice={saved === "1"}
        values={{
          name: product.name,
          summary: product.summary,
          description: product.description,
          base_price: won(product.base_price),
          list_price: won(product.list_price),
          cost: won(product.cost),
          tax_type: product.tax_type,
          status: product.status,
          stock_mode: product.stock_mode,
          stock: product.stock_mode === "product" ? String(product.stock) : "",
          images: product.images ?? [],
          category_ids: product.category_ids,
        }}
      />
      <div className="mt-8">
        <OptionsEditor
          slug={store.slug}
          productId={product.id}
          basePrice={product.base_price}
          stockByOption={product.stock_mode === "product"}
          initialGroups={product.option_groups ?? []}
          initialVariants={variants}
        />
        {variants.length > 0 && product.stock_mode === "product" && (
          <p className="mt-2 text-xs text-gray-500">옵션이 있는 상품은 위 「재고 수량」 대신 옵션 조합별 재고를 씁니다.</p>
        )}
      </div>
    </AdminShell>
  );
}
