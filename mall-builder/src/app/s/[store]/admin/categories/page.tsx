import { getCategoryRows, getStaffStore } from "@/lib/store";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { AdminShell, NoPermission } from "../admin-shell";
import DeleteButton from "./delete-button";
import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  renameCategoryAction,
  toggleCategoryAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { store: slug } = await params;
  const { error } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/categories`);
  if (!staff) return <NoPermission />;

  const rows = await getCategoryRows(store.id);
  const flat = flattenTree(buildCategoryTree(rows, true));
  const hasChildren = new Set(rows.map((r) => r.parent_id).filter(Boolean));

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/categories">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form action={createCategoryAction.bind(null, store.slug, null)} className="flex gap-2">
        <input name="name" maxLength={30} required placeholder="새 1단계 카테고리 이름 (예: 식품)" className="min-w-0 flex-1 rounded border px-3 py-2" />
        <button className="min-h-11 whitespace-nowrap rounded bg-gray-900 px-4 text-sm text-white">추가</button>
      </form>
      <p className="mt-2 text-xs text-gray-500">
        카테고리는 3단계까지 만들 수 있습니다. 숨긴 카테고리와 그 아래 카테고리는 손님 화면에 나오지 않습니다. 순서는 ↑↓로 바꿉니다.
      </p>

      {flat.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">아직 카테고리가 없습니다.</p>
      ) : (
        <ul className="mt-6 divide-y rounded-lg border">
          {flat.map((c) => (
            <li key={c.id} className="space-y-2 p-3" style={{ paddingLeft: `${0.75 + (c.depth - 1) * 1.5}rem` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400">{c.depth}단계</span>
                <form action={renameCategoryAction.bind(null, store.slug, c.id)} className="flex min-w-0 flex-1 gap-1">
                  <input name="name" defaultValue={c.name} maxLength={30} className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" />
                  <button className="rounded border px-2 py-1 text-xs">이름 저장</button>
                </form>
                {!c.is_visible && <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">숨김</span>}
                {c.is_visible && c.hiddenByParent && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">상위가 숨김</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                <form action={moveCategoryAction.bind(null, store.slug, c.id, "up")}>
                  <button className="rounded border px-2 py-1 text-xs" aria-label="위로">↑</button>
                </form>
                <form action={moveCategoryAction.bind(null, store.slug, c.id, "down")}>
                  <button className="rounded border px-2 py-1 text-xs" aria-label="아래로">↓</button>
                </form>
                <form action={toggleCategoryAction.bind(null, store.slug, c.id, !c.is_visible)}>
                  <button className="rounded border px-2 py-1 text-xs">{c.is_visible ? "숨기기" : "보이기"}</button>
                </form>
                {!hasChildren.has(c.id) && <DeleteButton name={c.name} action={deleteCategoryAction.bind(null, store.slug, c.id)} />}
              </div>
              {c.depth < 3 && (
                <form action={createCategoryAction.bind(null, store.slug, c.id)} className="flex gap-1">
                  <input name="name" maxLength={30} required placeholder={`「${c.name}」 아래 ${c.depth + 1}단계 추가`} className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" />
                  <button className="rounded border px-2 py-1 text-xs">하위 추가</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
