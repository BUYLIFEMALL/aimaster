import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryRows, getPublishedDesign, getShopProducts, getStoreBySlug } from "@/lib/store";
import { arrangeProducts, listFor, readList } from "@/lib/builder/pages";
import { buildCategoryTree, categoryPath, flattenTree } from "@/lib/categories";
import { ProductGrid } from "../../product-card";

export const dynamic = "force-dynamic";

function CommonImage({ b, alt }: { b: { image: string; link: string }; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={b.image} alt={alt} loading="lazy" className="block w-full h-auto" />;
  return b.link ? (
    <a href={b.link} {...(b.link.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{img}</a>
  ) : (
    img
  );
}

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 카테고리 상품 목록
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
  const [all, design] = await Promise.all([getShopProducts(store.id, { categoryIds: ids }), getPublishedDesign(store.id)]);
  // 디자인 빌더 D4: 열 수·정렬·품절 숨기기·카드·배너(몰 기본값 + 이 카테고리 덮어쓰기). 표시만 바꾼다
  const view = listFor(readList(design.list), node.id);
  const products = arrangeProducts(all, view);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
        <Link href={base} className="hover:text-blue-600 transition-colors">홈</Link>
        {path.map((p) => (
          <span key={p.id} className="flex items-center gap-1.5">
            <span className="text-slate-300">›</span>
            <Link href={`${base}/c/${p.id}`} className={p.id === node.id ? "font-bold text-slate-900" : "hover:text-blue-600 transition-colors"}>
              {p.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Category</span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{node.name}</h1>
        </div>
        <span className="text-xs font-medium text-slate-500">총 {products.length}개의 상품</span>
      </div>

      {node.children.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {node.children.map((child) => (
            <li key={child.id}>
              <Link
                href={`${base}/c/${child.id}`}
                className="inline-block rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-blue-400 hover:text-blue-600"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {view.banner && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80" data-list-banner>
          <CommonImage b={view.banner} alt={`${node.name} 안내`} />
        </div>
      )}

      <div className="mt-8">
        <ProductGrid base={base} products={products} columns={view.columns} card={view.card} empty="이 카테고리에는 아직 상품이 없습니다." />
      </div>
    </main>
  );
}
