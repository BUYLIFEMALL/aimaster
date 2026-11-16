// threads-auto(boksajang/threads-auto, MIT, 커밋 bd2fec7) src/main/services/coupang-product-selection.ts에서 옮김.
// 여러 경로(키워드·골드박스·카테고리 베스트·쿠팡 PL) 결과를 상품 번호로 합치고, 이미 등록한 상품·로켓 조건으로 거른 뒤
// 골드박스 4 · 로켓프레시 3 · 로켓 2 · 키워드 포함 1점 순으로 정렬한다. 로직은 원본 그대로, 타입만 이 프로그램에 맞췄다.
import type { CoupangProduct } from "@/lib/affiliate-clients/coupangApi";

export type CoupangSourceKind = "SEARCH" | "GOLDBOX" | "CATEGORY_BEST" | "COUPANG_PL";

export interface CoupangCandidate extends CoupangProduct {
  sourceKey: string;
  isRocketFresh: boolean;
  isGoldBox: boolean;
  isCategoryBest: boolean;
  isCoupangPl: boolean;
  sourceKinds: CoupangSourceKind[];
}

export function toCoupangCandidates(products: CoupangProduct[], kind: CoupangSourceKind): CoupangCandidate[] {
  return products.map((p) => ({
    ...p,
    sourceKey: String(p.productId),
    isRocketFresh: p.isRocketFresh === true,
    isGoldBox: kind === "GOLDBOX",
    isCategoryBest: kind === "CATEGORY_BEST",
    isCoupangPl: kind === "COUPANG_PL",
    sourceKinds: [kind],
  }));
}

export interface CoupangProductSelectionOptions {
  keywords: string[];
  rocketOnly: boolean;
  rocketFreshOnly: boolean;
  limit?: number;
  excludedSourceKeys?: ReadonlySet<string>;
}

export function selectCoupangProductCandidates(candidates: CoupangCandidate[], options: CoupangProductSelectionOptions): CoupangCandidate[] {
  const normalizedTerms = options.keywords.map((v) => v.trim().toLocaleLowerCase("ko-KR")).filter(Boolean);
  const unique = new Map<string, CoupangCandidate>();
  for (const candidate of candidates) {
    if (options.excludedSourceKeys?.has(candidate.sourceKey)) continue;
    if (options.rocketOnly && candidate.isRocket !== true) continue;
    if (options.rocketFreshOnly && candidate.isRocketFresh !== true && candidate.isRocket !== true) continue;
    const current = unique.get(candidate.sourceKey);
    if (!current) { unique.set(candidate.sourceKey, candidate); continue; }
    unique.set(candidate.sourceKey, {
      ...current,
      ...candidate,
      isRocket: current.isRocket || candidate.isRocket,
      isRocketFresh: current.isRocketFresh || candidate.isRocketFresh,
      isGoldBox: current.isGoldBox || candidate.isGoldBox,
      isCategoryBest: current.isCategoryBest || candidate.isCategoryBest,
      isCoupangPl: current.isCoupangPl || candidate.isCoupangPl,
      sourceKinds: [...new Set([...current.sourceKinds, ...candidate.sourceKinds])],
    });
  }
  const relevance = (item: CoupangCandidate) => normalizedTerms.some((term) => item.productName.toLocaleLowerCase("ko-KR").includes(term));
  const score = (item: CoupangCandidate) =>
    Number(item.isGoldBox) * 4 + Number(item.isRocketFresh) * 3 + Number(item.isRocket) * 2 + Number(relevance(item));
  return [...unique.values()]
    .sort((left, right) => score(right) - score(left) || left.productName.localeCompare(right.productName, "ko-KR"))
    .slice(0, options.limit ?? 100);
}

/**
 * 등록한 쿠팡 상품의 상품 번호. 새 칸 source_key가 있으면 그것, 없으면(칸 추가 전 등록) 검색 결과 추적 링크의
 * pageKey(link.coupang.com/re/AFFSDP?...&pageKey=번호) 또는 쿠팡 상품 주소의 /vp/products/번호에서 꺼낸다.
 * 단축 링크(link.coupang.com/a/…)는 번호가 없어 제외 대상에 넣지 못한다.
 */
export function coupangSourceKeyOf(row: { source_key?: string | null; product_url?: string | null }): string | null {
  if (row.source_key && /^\d+$/.test(row.source_key)) return row.source_key;
  const url = String(row.product_url ?? "");
  try {
    const parsed = new URL(url);
    const pageKey = parsed.searchParams.get("pageKey");
    if (pageKey && /^\d+$/.test(pageKey)) return pageKey;
    const match = /\/vp\/products\/(\d+)/.exec(parsed.pathname);
    if (match) return match[1];
  } catch { /* 주소가 아니면 번호 없음 */ }
  return null;
}
