import { createClient } from "@/lib/supabase/server";

// 디자인 빌더 D3 — 디자인 조각(DB 0080 mall_builder_design) 운영자 읽기. 표 읽기는 보안 규칙상 운영자만 된다
// 손님 화면은 게시본만 돌려주는 함수(getPublishedDesign, src/lib/store.ts)를 쓴다

export type DesignKind = "theme" | "header" | "footer" | "popup" | "list" | "detail";
export type DesignPart = { draft: Record<string, unknown>; published: Record<string, unknown> | null; draftAt: string | null; publishedAt: string | null };

/** 운영자 편집 화면 — 조각마다 초안·게시본. 저장한 적 없는 조각은 빠진다 */
export async function getDesignForEdit(storeId: string): Promise<Partial<Record<DesignKind, DesignPart>>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mall_builder_design").select("kind, draft, published, draft_updated_at, published_at").eq("store_id", storeId);
  if (error || !data) return {};
  const out: Partial<Record<DesignKind, DesignPart>> = {};
  for (const r of data as { kind: DesignKind; draft: Record<string, unknown>; published: Record<string, unknown> | null; draft_updated_at: string; published_at: string | null }[]) {
    out[r.kind] = { draft: r.draft ?? {}, published: r.published, draftAt: r.draft_updated_at, publishedAt: r.published_at };
  }
  return out;
}
