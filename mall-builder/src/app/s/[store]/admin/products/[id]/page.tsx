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
import SupplierVariantPrices from "./supplier-variant-prices";
import { getSupplierVariants } from "@/lib/supplier-store";
import { createClient } from "@/lib/supabase/server";
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
  searchParams: Promise<{ saved?: string; error?: string; ok?: string; msg?: string }>;
}) {
  const { store: slug, id } = await params;
  const { saved, error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products/${id}`);
  if (!staff) return <NoPermission />;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const product = await getProductForEdit(store.id, id);
  if (!product) notFound();
  const [categoryRows, variants, shippingPolicies, grades, gradePrices, tierMap] = await Promise.all([
    getCategoryRows(store.id),
    getProductVariants(product.id),
    getShippingPolicies(store.id, { mallOnly: true }),
    getGrades(store.id),
    getProductGradePriceInputs(product.id),
    getTierMap([product.id]),
  ]);
  // T1(0060) 공급사 상품이면 옵션 구성은 공급사가 정하고, 운영자는 옵션별 판매 추가금만 고친다
  const supabase = await createClient();
  const { data: supRow } = await supabase.from("mall_builder_product_supply").select("supplier_id, supply_price").eq("product_id", product.id).maybeSingle();
  const supplierOpts = supRow ? await getSupplierVariants(product.id) : null;
  const tierInput = (t: VolumeTier) => (t.discount_type === "rate" ? `${t.value}%` : t.discount_type === "amount" ? `-${t.value}` : String(t.value));
  const categories = flattenTree(buildCategoryTree(categoryRows, true));
  const won = (n: number | null) => (n == null ? "" : String(n));

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">상품 수정</h2>
        <Link href={`/s/${store.slug}/admin/products`} className="text-sm text-gray-500">← 상품 목록</Link>
      </div>
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      {supRow && <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-xs text-blue-800">공급사 상품입니다. 배송비는 그 공급사의 배송비 정책을 따르고(공급사 화면에서 정함, 「공급사」 메뉴에서 고칠 수 있음), 옵션 구성·재고는 공급사가 관리합니다.</p>}
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
          detail_images: product.detail_images ?? [],
          category_ids: product.category_ids,
          shipping_policy_id: product.shipping_policy_id ?? "",
        }}
      />
      <div className="mt-8">
        {supRow && supplierOpts ? (
          <SupplierVariantPrices slug={store.slug} productId={product.id} basePrice={product.base_price} supplyPrice={Number(supRow.supply_price)} variants={supplierOpts.variants} />
        ) : (
        <OptionsEditor
          slug={store.slug}
          productId={product.id}
          basePrice={product.base_price}
          stockByOption={product.stock_mode === "product"}
          initialGroups={product.option_groups ?? []}
          initialVariants={variants}
        />
        )}
        {variants.length > 0 && product.stock_mode === "product" && (
          <p className="mt-2 text-xs text-gray-500">옵션이 있는 상품은 위 「재고 수량」 대신 옵션 조합별 재고를 씁니다.</p>
        )}
      </div>
    </AdminShell>
  );
}
