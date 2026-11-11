import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryRows, getShopProducts, getStoreBySlug } from "@/lib/store";
import { buildCategoryTree, categoryPath, flattenTree } from "@/lib/categories";
import { ProductGrid } from "../../product-card";

export const dynamic = "force-dynamic";

// 손님 카테고리 화면 — 경로·하위 카테고리·이 카테고리와 하위 카테고리의 상품
export default async function CategoryPage({ params }: { params: Promise<{ store: string; category: string }> }) {
  const { store: slug, category: categoryId } = await params;
  const store = await getStoreBySlug(slug);
  const rows = await getCategoryRows(store.id);

  // 손님 기준으로 보이는 카테고리만 — 숨김이거나 상위가 숨겨진 카테고리는 주소로 들어와도 없음 처리
  const visible = flattenTree(buildCategoryTree(rows, false));
  const node = visible.find((c) => c.id === categoryId);
  if (!node) notFound();

  const base = `/s/${store.slug}`;
  const path = categoryPath(rows, node.id);
  const ids = flattenTree([node]).map((c) => c.id);
  const products = await getShopProducts(store.id, { categoryIds: ids });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        <Link href={base}>홈</Link>
        {path.map((p) => (
          <span key={p.id} className="flex items-center gap-1">
            <span>›</span>
            <Link href={`${base}/c/${p.id}`} className={p.id === node.id ? "font-semibold text-gray-900" : ""}>{p.name}</Link>
          </span>
        ))}
      </nav>
      <h1 className="mt-4 text-2xl font-bold">{node.name}</h1>

      {node.children.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {node.children.map((child) => (
            <li key={child.id}>
              <Link href={`${base}/c/${child.id}`} className="inline-block rounded-full border px-4 py-2 text-sm hover:bg-gray-50">
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <ProductGrid base={base} products={products} empty="이 카테고리에는 아직 상품이 없습니다." />
      </div>
    </main>
  );
}
