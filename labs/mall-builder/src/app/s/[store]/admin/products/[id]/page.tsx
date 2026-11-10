import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryRows,
  getGrades,
  getProductForEdit,
  getProductGradePriceInputs,
  getProductVariants,
  getShippingPolicies,
  getStaffStore,
  getTierMap,
} from "@/lib/store";
import type { VolumeTier } from "@/lib/pricing";
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
  const [categoryRows, variants, shippingPolicies, grades, gradePrices, tierMap] = await Promise.all([
    getCategoryRows(store.id),
    getProductVariants(product.id),
    getShippingPolicies(store.id),
    getGrades(store.id),
    getProductGradePriceInputs(product.id),
    getTierMap([product.id]),
  ]);
  const tierInput = (t: VolumeTier) => (t.discount_type === "rate" ? `${t.value}%` : t.discount_type === "amount" ? `-${t.value}` : String(t.value));
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
        shippingPolicies={shippingPolicies}
        grades={grades}
        values={{
          visibility: product.visibility,
          price_visibility: product.price_visibility,
          grade_prices: gradePrices,
          moq: product.moq > 1 ? String(product.moq) : "",
          order_unit: product.order_unit > 1 ? String(product.order_unit) : "",
          max_qty: product.max_qty ? String(product.max_qty) : "",
          tiers: (tierMap.get(product.id) ?? []).map((t) => ({ min_qty: String(t.min_qty), value: tierInput(t) })),
          product_code: product.product_code ?? "",
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
          shipping_policy_id: product.shipping_policy_id ?? "",
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
