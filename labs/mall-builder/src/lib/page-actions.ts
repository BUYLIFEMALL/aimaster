"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateDoc } from "@/lib/blocks";

// 첫 화면 블록 — 초안 저장·게시. 내용 검사는 validateDoc, 운영자 확인·모양·크기는 DB 함수가 한다
// 편집기(클라이언트)에서 바로 부르므로 이동하지 않고 결과를 돌려준다

type Result = { ok: true; at: string } | { ok: false; error: string };

async function save(storeId: string, raw: unknown): Promise<Result> {
  const v = validateDoc(raw);
  if (!v.ok) return v;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_save_page_draft", { p_store_id: storeId, p_doc: v.value });
  return error ? { ok: false, error: error.message } : { ok: true, at: data as string };
}

export async function saveHomeDraftAction(slug: string, storeId: string, raw: unknown): Promise<Result> {
  const r = await save(storeId, raw);
  revalidatePath(`/s/${slug}/admin/home`);
  return r;
}

/** 지금 편집 중인 내용을 저장하고 바로 손님 화면에 게시 */
export async function publishHomeAction(slug: string, storeId: string, raw: unknown): Promise<Result> {
  const saved = await save(storeId, raw);
  if (!saved.ok) return saved;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_publish_page", { p_store_id: storeId });
  revalidatePath(`/s/${slug}`, "layout");
  return error ? { ok: false, error: error.message } : { ok: true, at: data as string };
}
