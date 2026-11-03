"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateNotice } from "@/lib/notices";

// 공지 쓰기·고치기·삭제 — 보안 규칙(그 몰 운영자만)을 그대로 거친다

async function staffStore(slug: string) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) back(slug, "몰을 찾을 수 없습니다.");
  const { data: staff } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: store!.id });
  if (staff !== true) back(slug, "이 몰을 고칠 권한이 없습니다.");
  return { supabase, storeId: store!.id as string };
}

function back(slug: string, error?: string, ok?: string): never {
  revalidatePath(`/s/${slug}`, "layout");
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(`/s/${slug}/admin/notices${q}`);
}

export async function saveNoticeAction(slug: string, noticeId: string | null, form: FormData) {
  const v = validateNotice({ title: form.get("title"), body: form.get("body"), pinned: form.get("pinned") });
  if (!v.ok) back(slug, v.error);
  const { supabase, storeId } = await staffStore(slug);
  const row = (v as { value: { title: string; body: string; is_pinned: boolean } }).value;
  if (noticeId) {
    const { error } = await supabase.from("mall_builder_notices").update({ ...row, updated_at: new Date().toISOString() }).eq("id", noticeId).eq("store_id", storeId);
    back(slug, error?.message, "공지를 고쳤습니다.");
  }
  const { error } = await supabase.from("mall_builder_notices").insert({ ...row, store_id: storeId });
  back(slug, error?.message, "공지를 올렸습니다.");
}

export async function deleteNoticeAction(slug: string, noticeId: string) {
  const { supabase, storeId } = await staffStore(slug);
  const { error } = await supabase.from("mall_builder_notices").delete().eq("id", noticeId).eq("store_id", storeId);
  back(slug, error?.message, "공지를 삭제했습니다.");
}
