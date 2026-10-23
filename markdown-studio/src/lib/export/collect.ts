// 내보낼 문서 수집·이름 정리 (순수 함수)
import { type DocumentNode, descendants, safeFilename } from "../documents/model";

export interface ExportDoc { id: string; path: string; name: string; markdown: string }
export type Scope = { type: "document"; id: string } | { type: "folder"; id: string } | { type: "all" };

export function pathOf(nodes: DocumentNode[], node: DocumentNode): string {
  const parts = [node.name];
  const seen = new Set([node.id]);
  let parent = node.parentId;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const p = nodes.find(n => n.id === parent);
    if (!p) break;
    parts.unshift(p.name); parent = p.parentId;
  }
  return parts.join("/");
}

/** 범위 안의 (휴지통 제외) 문서를 폴더 경로 순서로 모은다. 폴더가 비어 있으면 빈 배열 */
export function collectDocuments(nodes: DocumentNode[], scope: Scope): ExportDoc[] {
  const live = nodes.filter(n => !n.deletedAt);
  let pool: DocumentNode[];
  if (scope.type === "all") pool = live;
  else {
    const root = live.find(n => n.id === scope.id);
    if (!root) return [];
    pool = scope.type === "document" ? [root] : live.filter(n => descendants(live, root.id).has(n.id));
  }
  return pool.filter(n => n.kind === "document")
    .map(n => ({ id: n.id, path: pathOf(live, n), name: n.name, markdown: n.markdown }))
    .sort((a, b) => a.path.localeCompare(b.path, "ko", { numeric: true }));
}

/** ZIP 안 경로 정리: 각 구간을 안전한 이름으로, 같은 경로는 (2), (3)을 붙인다 */
export function zipPaths(paths: string[], ext: string): string[] {
  const seen = new Map<string, number>();
  return paths.map(p => {
    const segs = p.split("/").map(s => safeFilename(s));
    const file = segs.pop()!.replace(/\.(md|markdown|txt)$/i, "");
    const base = [...segs, file].join("/");
    const key = base.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return `${n === 1 ? base : `${base} (${n})`}.${ext}`;
  });
}

export const localDateStamp = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
