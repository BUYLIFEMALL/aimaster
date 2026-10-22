import "server-only";
// BLC-10 (2026-10-22): 노드 하나만 반영하는 저장 — 저장 직전에 최신 원고를 다시 읽고(작업실 image.ts 방식),
// 그 사이 다른 저장이 끼면(saveRevision 불일치) 다시 읽어 최대 3번 시도. 블록 위치(contentBlocks)도 함께 저장해 새로고침해도 복원.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createContentBlocks, getContentBlocks, getContentImages, type DraftRecord } from "@/components/studio/shared";
import { draftLocked, draftReport, nextDraftReport, writableDraft } from "@/lib/draftWriteGuard";
import type { ImageNode, NodeBlock } from "@/lib/imageNodes";

export type NodeState = { images: ImageNode[]; blocks: NodeBlock[] };
export class NodeStoreError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function readNodes(supabase: SupabaseClient, userId: string, draftId: string) {
  const { data: draft } = await supabase.from("naver_blog_seo_drafts")
    .select("id, topic, title, keywords, body, image_path, seo_report").eq("id", draftId).eq("user_id", userId).maybeSingle();
  if (!draft) throw new NodeStoreError("내 블로그(원문)을 찾지 못했습니다.", 404);
  const report = draftReport(draft.seo_report);
  if (draftLocked(report)) throw new NodeStoreError("자동 발행을 시작한 원고의 이미지는 바꿀 수 없습니다.", 409);
  const images = getContentImages(draft as unknown as DraftRecord) as ImageNode[];
  const stored = getContentBlocks(draft as unknown as DraftRecord) as NodeBlock[];
  const blocks = stored.length ? stored : createContentBlocks(draft as unknown as DraftRecord, images) as NodeBlock[];
  return { draft, report, state: { images, blocks } as NodeState };
}

// change가 null을 돌려주면 저장하지 않는다(예: 그 사이 노드가 지워짐).
export async function changeNodes(supabase: SupabaseClient, userId: string, draftId: string, change: (state: NodeState) => NodeState | null) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { report, state } = await readNodes(supabase, userId, draftId);
    const next = change(state);
    if (!next) return { saved: false as const, state, previous: state };
    const { data } = await writableDraft(supabase.from("naver_blog_seo_drafts")
      .update({ seo_report: nextDraftReport(report, { contentImages: next.images, contentBlocks: next.blocks }), updated_at: new Date().toISOString() })
      .eq("id", draftId).eq("user_id", userId), report).select("id").maybeSingle();
    if (data) return { saved: true as const, state: next, previous: state };
  }
  throw new NodeStoreError("다른 저장과 겹쳐 이미지 정보를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 409);
}
