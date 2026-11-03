import { getCategoryRows, getGrades, getShippingPolicies, getStaffStore } from "@/lib/store";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { AdminShell, NoPermission } from "../../admin-shell";
import ProductForm from "../product-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NewProductPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products/new`);
  if (!staff) return <NoPermission />;
  const [categoryRows, shippingPolicies, grades] = await Promise.all([getCategoryRows(store.id), getShippingPolicies(store.id), getGrades(store.id)]);
  const categories = flattenTree(buildCategoryTree(categoryRows, true));

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      <h2 className="mb-4 text-lg font-semibold">새 상품 등록</h2>
      <ProductForm
        slug={store.slug}
        storeId={store.id}
        productId={null}
        categories={categories}
        savedNotice={false}
        shippingPolicies={shippingPolicies}
        grades={grades}
        values={{
          name: "", summary: "", description: "", base_price: "", list_price: "", cost: "",
          tax_type: "taxable", status: "draft", stock_mode: "none", stock: "", images: [], category_ids: [], shipping_policy_id: "",
          visibility: "public", price_visibility: "all", grade_prices: {},
        }}
      />
    </AdminShell>
  );
}
