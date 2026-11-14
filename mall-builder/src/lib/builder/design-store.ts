import { createClient } from "@/lib/supabase/server";
import { latestStamp } from "@/lib/builder/history";

// 디자인 빌더 D3 — 디자인 조각(DB 0080 mall_builder_design) 운영자 읽기. 표 읽기는 보안 규칙상 운영자만 된다
// 손님 화면은 게시본만 돌려주는 함수(getPublishedDesign, src/lib/store.ts)를 쓴다

export type DesignKind = "theme" | "header" | "footer" | "popup" | "list" | "detail";
export type DesignPart = { draft: Record<string, unknown>; published: Record<string, unknown> | null; draftAt: string | null; publishedAt: string | null };

/** D6 게시 직후 기록 한 줄(DB 0081). 실패해도 게시는 이미 끝났으므로 막지 않는다(0081이 아직 없는 배포에서도 게시가 되게) */
export async function recordPublished(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string): Promise<void> {
  const r = await supabase.rpc("mall_builder_design_record", { p_store_id: storeId });
  if (r.error) console.warn("[design] 게시 기록 남기기 실패(게시는 됨):", r.error.message);
}

/** D6-3 지금 DB의 마지막 초안 저장 시각(첫 화면 + 조각 중 가장 늦은 것). 표 읽기는 운영자만 */
export async function currentDraftStamp(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string): Promise<string | null> {
  const [a, b] = await Promise.all([
    supabase.from("mall_builder_pages").select("draft_updated_at").eq("store_id", storeId).eq("kind", "home").maybeSingle(),
    supabase.from("mall_builder_design").select("draft_updated_at").eq("store_id", storeId),
  ]);
  const home = (a.data as { draft_updated_at?: string } | null)?.draft_updated_at ?? null;
  const parts = ((b.data ?? []) as { draft_updated_at: string }[]).map((r) => r.draft_updated_at);
  return latestStamp([home, ...parts]);
}

export type DesignHistoryRow = { id: string; snapshot: unknown; createdAt: string };

/** D6 게시 기록(최근 20개, 새것부터). 표 읽기는 보안 규칙상 운영자만. 0081 전(표 없음)이면 빈 목록 */
export async function getDesignHistory(storeId: string): Promise<DesignHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mall_builder_design_history").select("id, snapshot, created_at").eq("store_id", storeId).order("created_at", { ascending: false }).limit(20);
  if (error || !data) return [];
  return (data as { id: string; snapshot: unknown; created_at: string }[]).map((r) => ({ id: r.id, snapshot: r.snapshot, createdAt: r.created_at }));
}

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
