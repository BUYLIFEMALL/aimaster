import type { SupabaseClient } from "@supabase/supabase-js";
import { CompatibleChatError } from "../compatibleChat/config";
import { extractKeywords, isSummaryQuestion, mergeHybrid, type ChunkHit, type DocHit } from "./core";
import { documentCutoff } from "./documentRules";

type Store = Pick<SupabaseClient, "from" | "rpc">;
async function firstChunks(store: Store, userId: string, ids: string[]): Promise<DocHit[]> {
  const hits: DocHit[] = [];
  const perDoc = Math.max(1, Math.floor(5 / ids.length));
  for (const id of ids.slice(0, 5)) {
    const { data, error } = await store.from("dcb_chunks").select("content,dcb_documents!inner(name,user_id,created_at,processing_status)").eq("user_id", userId).eq("document_id", id).gt("created_at", documentCutoff()).eq("dcb_documents.user_id", userId).eq("dcb_documents.processing_status", "ready").gt("dcb_documents.created_at", documentCutoff()).order("chunk_index").limit(perDoc);
    if (error) throw new CompatibleChatError("문서 앞부분을 확인하지 못했습니다.", 500);
    hits.push(...(data ?? []).map((c) => ({ document_id: id, document_name: (c.dcb_documents as unknown as { name: string }).name, content: c.content as string, similarity: 0 })));
  }
  return hits.slice(0, 5);
}

/** 모든 검색은 검증된 ID 범위를 먼저 적용한다. 범위 검색 실패를 전체 검색으로 바꾸지 않는다. */
export async function findDocumentHits(store: Store, userId: string, vector: number[], question: string, documentIds: string[], explicitlySelected: boolean): Promise<DocHit[]> {
  if (!documentIds.length) return [];
  const { data, error } = await store.rpc("dcb_match_chunks_scoped", { p_user_id: userId, p_embedding: JSON.stringify(vector), p_document_ids: documentIds, p_count: 20 });
  if (error) throw new CompatibleChatError("선택 범위에서 문서를 검색하지 못했습니다. 다시 확인해 주세요.", 500);
  // DB가 정상이어도 최종 자료/출처가 범위를 벗어나지 않게 이중 확인한다.
  const vectorHits = ((data ?? []) as ChunkHit[]).filter((hit) => typeof hit.document_id === "string" && documentIds.includes(hit.document_id));
  if (explicitlySelected && isSummaryQuestion(question)) return firstChunks(store, userId, documentIds);
  const keywords = extractKeywords(question);
  let keywordHits: ChunkHit[] = [];
  if (keywords.length) {
    const { data: rows, error: keywordError } = await store.from("dcb_chunks")
      .select("id,document_id,content,dcb_documents!inner(name,user_id,created_at,processing_status)")
      .eq("user_id", userId).in("document_id", documentIds).gt("created_at", documentCutoff())
      .eq("dcb_documents.user_id", userId).eq("dcb_documents.processing_status", "ready").gt("dcb_documents.created_at", documentCutoff())
      .or(keywords.map((k) => `content.ilike.%${k}%`).join(",")).limit(30);
    if (keywordError) throw new CompatibleChatError("선택 범위의 키워드 검색을 완료하지 못했습니다.", 500);
    keywordHits = (rows ?? []).map((c) => ({ id: c.id as string, document_id: c.document_id as string, document_name: (c.dcb_documents as unknown as { name: string }).name, content: c.content as string, similarity: vectorHits.find((v) => v.id === c.id)?.similarity ?? 0 }));
  }
  const merged = mergeHybrid(vectorHits, keywordHits, keywords);
  if (merged.length) return merged;
  if (explicitlySelected) return vectorHits.length ? vectorHits.slice(0, 5) : firstChunks(store, userId, documentIds);
  if (isSummaryQuestion(question) && vectorHits[0]?.document_id) return firstChunks(store, userId, [vectorHits[0].document_id]);
  return [];
}
