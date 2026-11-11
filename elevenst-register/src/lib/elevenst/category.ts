// 11번가 카테고리 — 전체 카테고리 조회 `GET /rest/cateservice/category`(키 필요 없음, 2026-11-11 실측: 약 3MB·15,304개·맨 아래 12,323개).
// 응답: <ns2:categorys><ns2:category><depth/><dispNm/><dispNo/><parentDispNo/><leafYn/>…</ns2:category>…</ns2:categorys>
// 등록은 맨 아래 카테고리(leafYn=Y)만 된다(명세: 세카테고리, 없으면 소카테고리).
// 이 파일은 순수 함수만 둔다(시험 가능). 받아 오기·메모리 보관은 categoryStore.ts.

export interface CategoryRow {
  no: string;
  name: string;
  parent: string; // 맨 위는 "0"
  depth: number;
  leaf: boolean;
}

export interface CategoryTree {
  byNo: Map<string, CategoryRow>;
  children: Map<string, CategoryRow[]>;
  leaves: CategoryRow[];
}

const BLOCK_RE = /<(?:[\w-]+:)?category>([\s\S]*?)<\/(?:[\w-]+:)?category>/g;
const tag = (b: string, t: string) => b.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1]?.trim() ?? "";

export function parseCategories(xml: string): CategoryRow[] {
  const rows: CategoryRow[] = [];
  for (const m of xml.matchAll(BLOCK_RE)) {
    const b = m[1];
    const no = tag(b, "dispNo");
    if (!no) continue;
    rows.push({ no, name: decodeEntities(tag(b, "dispNm")), parent: tag(b, "parentDispNo") || "0", depth: Number(tag(b, "depth")) || 0, leaf: tag(b, "leafYn") === "Y" });
  }
  return rows;
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");
}

export function buildTree(rows: CategoryRow[]): CategoryTree {
  const byNo = new Map(rows.map((r) => [r.no, r]));
  const children = new Map<string, CategoryRow[]>();
  for (const r of rows) {
    const list = children.get(r.parent);
    if (list) list.push(r);
    else children.set(r.parent, [r]);
  }
  return { byNo, children, leaves: rows.filter((r) => r.leaf) };
}

/** 맨 위부터 이 카테고리까지의 이름들 */
export function categoryPath(tree: CategoryTree, no: string): CategoryRow[] {
  const out: CategoryRow[] = [];
  let cur = tree.byNo.get(no);
  for (let guard = 0; cur && guard < 8; guard++) {
    out.unshift(cur);
    cur = cur.parent === "0" ? undefined : tree.byNo.get(cur.parent);
  }
  return out;
}

export const pathLabel = (tree: CategoryTree, no: string) => categoryPath(tree, no).map((c) => c.name).join(" › ");

export function childrenOf(tree: CategoryTree, no: string): CategoryRow[] {
  return tree.children.get(no) ?? [];
}

export interface CategoryHit {
  no: string;
  path: string;
  score: number;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

/**
 * 상품명·검색어로 맨 아래 카테고리 후보를 찾는다(AI 없이 이름 맞추기).
 * 점수: 맞힌 검색어 낱말 수 × 4(가장 중요) + 낱말이 카테고리 이름에 있으면 +3, 상위 경로에만 있으면 +2
 *       + 카테고리 이름이 검색어 낱말과 같거나(3자 이상이면) 검색어 안에 통째로 있으면 +2.
 * (「스테인리스」 안의 「리스」처럼 짧은 이름이 우연히 걸리는 것을 막으려고 통째 일치는 낱말 단위·3자 이상만 본다)
 */
export function searchLeaves(tree: CategoryTree, query: string, limit = 12): CategoryHit[] {
  const q = norm(query);
  const words = [...new Set(query.split(/[\s,/()[\]·+]+/).map(norm).filter((w) => w.length >= 2 && !/^\d+[a-z]*$/.test(w)))];
  if (!words.length) return [];
  const hits = scoreLeaves(tree, words, q, false);
  // 하나도 못 찾으면 「여행백팩」처럼 카테고리 이름(「백팩」)으로 끝나는 합성어 낱말로 한 번 더 찾는다
  // (일반 검색에 결과가 있을 때는 쓰지 않아 「스테인리스」 → 「리스」 같은 우연 일치를 막는다)
  const found = hits.length ? hits : scoreLeaves(tree, words, q, true);
  return found.sort((a, b) => b.score - a.score || a.path.length - b.path.length).slice(0, limit);
}

function scoreLeaves(tree: CategoryTree, words: string[], q: string, compound: boolean): CategoryHit[] {
  const hits: CategoryHit[] = [];
  for (const leaf of tree.leaves) {
    const leafName = norm(leaf.name);
    const path = categoryPath(tree, leaf.no);
    const upper = norm(path.slice(0, -1).map((c) => c.name).join(""));
    const parts = compound ? leaf.name.split(/[/,()·&]+/).map(norm).filter((p) => p.length >= 2) : [];
    let matched = 0;
    let score = 0;
    for (const w of words) {
      if (leafName.includes(w)) {
        score += 3;
        matched++;
      } else if (upper.includes(w)) {
        score += 2;
        matched++;
      } else if (parts.some((p) => w.length > p.length && w.endsWith(p))) {
        score += 1;
        matched++;
      }
    }
    if (!matched) continue;
    score += matched * 4;
    if (!leafName.startsWith("기타") && (words.includes(leafName) || (leafName.length >= 3 && q.includes(leafName)))) score += 2;
    hits.push({ no: leaf.no, path: path.map((c) => c.name).join(" › "), score });
  }
  return hits;
}
