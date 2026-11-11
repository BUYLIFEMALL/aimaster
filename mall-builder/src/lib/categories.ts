// 카테고리 트리 — DB의 평평한 목록(mall_builder_categories)을 3단계 트리로 만든다.

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  depth: number;
  sort: number;
  is_visible: boolean;
};

export type CategoryNode = CategoryRow & { children: CategoryNode[]; hiddenByParent: boolean };

/**
 * 트리 만들기. 형제끼리는 sort → 이름 순.
 * includeHidden=false(손님 화면)면 숨긴 카테고리와 그 아래 전부를 뺀다.
 * includeHidden=true(운영자 화면)면 모두 넣고, 상위가 숨겨져 손님에게 안 보이는 칸은 hiddenByParent=true.
 */
export function buildCategoryTree(rows: CategoryRow[], includeHidden: boolean): CategoryNode[] {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const row of rows) {
    const key = row.parent_id ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), row]);
  }
  const ordered = (list: CategoryRow[]) =>
    [...list].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ko"));

  const walk = (parentId: string | null, parentHidden: boolean): CategoryNode[] =>
    ordered(byParent.get(parentId) ?? [])
      .filter((row) => includeHidden || row.is_visible)
      .map((row) => ({
        ...row,
        hiddenByParent: parentHidden,
        children: walk(row.id, parentHidden || !row.is_visible),
      }));

  return walk(null, false);
}

/** 트리를 화면 목록용으로 펼치기(위에서 아래 순서) */
export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

/** 형제 사이에서 위·아래로 한 칸 옮길 때 자리를 바꿀 상대. 없으면 null */
export function swapTarget(rows: CategoryRow[], id: string, direction: "up" | "down"): { a: CategoryRow; b: CategoryRow } | null {
  const me = rows.find((r) => r.id === id);
  if (!me) return null;
  const siblings = rows
    .filter((r) => (r.parent_id ?? null) === (me.parent_id ?? null))
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ko"));
  const i = siblings.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return null;
  return { a: me, b: siblings[j] };
}

/** 새 카테고리의 순서 값 — 형제 중 가장 큰 값 + 10 */
export function nextSort(rows: CategoryRow[], parentId: string | null): number {
  const sorts = rows.filter((r) => (r.parent_id ?? null) === parentId).map((r) => r.sort);
  return (sorts.length ? Math.max(...sorts) : 0) + 10;
}

/** 루트부터 이 카테고리까지의 경로(빵부스러기) */
export function categoryPath(rows: CategoryRow[], id: string): CategoryRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const path: CategoryRow[] = [];
  let cur = byId.get(id);
  while (cur && path.length < 3) {
    path.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return path;
}

export function categoryNameError(input: string): string | null {
  const name = input.trim();
  if (name.length < 1 || name.length > 30) return "카테고리 이름은 1~30자로 입력해 주세요.";
  return null;
}
