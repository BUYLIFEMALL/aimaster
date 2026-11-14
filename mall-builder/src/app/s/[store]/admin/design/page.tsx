import Link from "next/link";
import { getCategoryRows, getHomeForEdit, getPublishedDesign, getStaffStore, getStoreProducts } from "@/lib/store";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { readTheme, themeStyle } from "@/lib/theme";
import { NoPermission } from "../admin-shell";
import DesignEditor from "./design-editor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 디자인 빌더 D2 — 끌어 놓는 첫 화면 편집기(Puck). 저장 모양·검사·저장 함수는 기존 첫 화면 편집(F18)과 같다
// 초안 저장은 나만 보이고, 「손님 화면에 게시」를 눌러야 손님에게 보인다
export default async function AdminDesignPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/design`);
  if (!staff) return <NoPermission />;
  const [home, rows, products, design] = await Promise.all([getHomeForEdit(store.id), getCategoryRows(store.id), getStoreProducts(store.id), getPublishedDesign(store.id)]);
  const categories = flattenTree(buildCategoryTree(rows, true)).map((c) => ({ id: c.id, name: `${"　".repeat(c.depth - 1)}${c.name}${c.is_visible ? "" : " (숨김)"}` }));
  const pickable = products.filter((p) => p.status === "on_sale" || p.status === "sold_out").map((p) => ({ id: p.id, name: p.name }));

  return (
    // 편집 칸이 넓어야 하므로 관리 메뉴 없이 화면 전체를 쓴다(맨 위 줄에 돌아가기)
    <div className="flex h-screen flex-col bg-gray-100 px-3 py-2" data-design-page>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <Link href={`/s/${store.slug}/admin`} className="font-semibold text-gray-800 hover:underline">
          ← {store.name} 관리 화면
        </Link>
        <span>왼쪽에서 블록을 끌어 놓고, 가운데에서 블록을 눌러 오른쪽에서 고칩니다. <b>초안 저장</b>은 나만 보이고, <b>손님 화면에 게시</b>를 눌러야 손님에게 보입니다.</span>
        <Link href={`/s/${store.slug}`} target="_blank" className="underline">손님 화면 열기 ↗</Link>
        <Link href={`/s/${store.slug}/admin/home`} className="underline">간단 편집(예전 화면)</Link>
      </div>
      <DesignEditor
        slug={store.slug}
        storeId={store.id}
        categories={categories}
        products={pickable}
        initial={home.draft}
        published={home.published}
        draftAt={home.draftAt}
        publishedAt={home.publishedAt}
        themeVars={themeStyle(readTheme(design.theme))}
      />
    </div>
  );
}
