import "server-only";
import { decodeResponse } from "@/lib/elevenst/xml";
import { ELEVENST_HOST } from "@/lib/elevenst/client";
import { buildTree, parseCategories, type CategoryTree } from "@/lib/elevenst/category";

// 11번가 전체 카테고리를 서버 메모리에 12시간 보관한다(키 필요 없는 공개 조회 — 회원 키를 쓰지 않음).
// 응답이 약 3MB라 Next 데이터 캐시(2MB 한도)에 넣지 않고 함수 인스턴스 메모리에 둔다. 동시에 여러 번 불려도 한 번만 받는다.

const TTL_MS = 12 * 60 * 60 * 1000;
let cached: { tree: CategoryTree; at: number } | null = null;
let inflight: Promise<CategoryTree> | null = null;

async function download(): Promise<CategoryTree> {
  const r = await fetch(`${ELEVENST_HOST}/rest/cateservice/category`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`category ${r.status}`);
  const rows = parseCategories(decodeResponse(new Uint8Array(await r.arrayBuffer())));
  if (rows.length < 1000) throw new Error(`category rows ${rows.length}`);
  return buildTree(rows);
}

export async function getCategoryTree(): Promise<CategoryTree> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.tree;
  if (!inflight) {
    inflight = download()
      .then((tree) => {
        cached = { tree, at: Date.now() };
        return tree;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (e) {
    // 새로 받기에 실패해도 예전 목록이 있으면 그대로 쓴다
    if (cached) return cached.tree;
    throw e;
  }
}
