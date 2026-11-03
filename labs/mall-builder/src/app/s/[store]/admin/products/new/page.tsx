import { getCategoryRows, getStaffStore } from "@/lib/store";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { AdminShell, NoPermission } from "../../admin-shell";
import ProductForm from "../product-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NewProductPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products/new`);
  if (!staff) return <NoPermission />;
  const categories = flattenTree(buildCategoryTree(await getCategoryRows(store.id), true));

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      <h2 className="mb-4 text-lg font-semibold">새 상품 등록</h2>
      <ProductForm
        slug={store.slug}
        storeId={store.id}
        productId={null}
        categories={categories}
        savedNotice={false}
        values={{
          name: "", summary: "", description: "", base_price: "", list_price: "", cost: "",
          tax_type: "taxable", status: "draft", stock_mode: "none", stock: "", images: [], category_ids: [],
        }}
      />
    </AdminShell>
  );
}
