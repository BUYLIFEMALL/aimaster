import type { SupabaseClient } from "@supabase/supabase-js";
import { CompatibleChatError } from "../compatibleChat/config";
import { UUID } from "../bots/core";
import { categoryValue, documentCutoff, PREVIEW_CHUNKS } from "./documentRules";

type Store = Pick<SupabaseClient, "from" | "rpc">;
export const DOCUMENT_COLUMNS = "id,name,size_bytes,chunk_count,created_at,category,processing_status,extraction_warning";

export async function ownReadyDocument(store: Store, userId: string, id: unknown) {
  if (typeof id !== "string" || !UUID.test(id)) throw new CompatibleChatError("문서를 다시 선택해 주세요.");
  const { data, error } = await store.from("dcb_documents").select(DOCUMENT_COLUMNS).eq("id", id).eq("user_id", userId).gt("created_at", documentCutoff()).maybeSingle();
  if (error) throw new CompatibleChatError("문서를 확인하지 못했습니다.", 500);
  if (!data) throw new CompatibleChatError("문서를 찾지 못했거나 보관 기간이 지났습니다.", 404);
  if (data.processing_status !== "ready") throw new CompatibleChatError("아직 처리 중인 문서입니다. 완료 후 다시 선택해 주세요.", 409);
  return data;
}

export async function resolveDocumentScope(store: Store, userId: string, selection: string[] | null): Promise<string[]> {
  let query = store.from("dcb_documents").select("id,processing_status").eq("user_id", userId).gt("created_at", documentCutoff());
  if (selection) query = query.in("id", selection);
  const { data, error } = await query;
  if (error) throw new CompatibleChatError("참고 문서 범위를 확인하지 못했습니다.", 500);
  if (selection && data?.length !== selection.length) throw new CompatibleChatError("선택한 문서를 찾지 못했거나 보관 기간이 지났습니다. 다시 선택해 주세요.", 404);
  if (selection && data?.some((d) => d.processing_status !== "ready")) throw new CompatibleChatError("선택한 문서가 아직 처리 중입니다. 완료 후 다시 선택해 주세요.", 409);
  return (data ?? []).filter((d) => d.processing_status === "ready").map((d) => d.id as string);
}

export async function previewDocument(store: Store, userId: string, id: unknown) {
  const document = await ownReadyDocument(store, userId, id);
  const { data, error } = await store.from("dcb_chunks").select("content,chunk_index,dcb_documents!inner(id)").eq("user_id", userId).eq("document_id", document.id).gt("created_at", documentCutoff()).eq("dcb_documents.user_id", userId).eq("dcb_documents.processing_status", "ready").gt("dcb_documents.created_at", documentCutoff()).order("chunk_index").limit(PREVIEW_CHUNKS + 1);
  if (error) throw new CompatibleChatError("문서 미리보기를 불러오지 못했습니다.", 500);
  return { document, text: (data ?? []).slice(0, PREVIEW_CHUNKS).map((c) => c.content).join("\n\n"), truncated: (data?.length ?? 0) > PREVIEW_CHUNKS, previewChunks: Math.min(data?.length ?? 0, PREVIEW_CHUNKS) };
}

export async function updateDocumentCategory(store: Store, userId: string, id: unknown, input: unknown) {
  const category = categoryValue(input);
  const document = await ownReadyDocument(store, userId, id);
  const { data, error } = await store.from("dcb_documents").update({ category }).eq("id", document.id).eq("user_id", userId).eq("processing_status", "ready").gt("created_at", documentCutoff()).select(DOCUMENT_COLUMNS).maybeSingle();
  if (error) throw new CompatibleChatError("문서 분류를 저장하지 못했습니다.", 500);
  if (!data) throw new CompatibleChatError("문서가 삭제되었거나 보관 기간이 지났습니다.", 404);
  return data;
}
