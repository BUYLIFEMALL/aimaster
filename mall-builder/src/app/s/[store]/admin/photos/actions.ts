"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 안 쓰는 사진 지우기(D7) — 고른 사진 중 지금 다시 확인해도 「지울 수 있음」인 것만 지운다
// 목록·쓰임 판단은 DB 함수 mall_builder_store_files(그 몰 운영자만), 지우기는 저장소 지우기 규칙(그 몰 운영자만)

const BUCKET = "mall-builder-public";
const MAX_DELETE = 100;

function back(slug: string, error?: string, ok?: string): never {
  revalidatePath(`/s/${slug}/admin/photos`);
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(`/s/${slug}/admin/photos${q}`);
}

export async function deleteUnusedPhotosAction(slug: string, form: FormData) {
  const picked = new Set(form.getAll("name").map(String));
  if (!picked.size) back(slug, "지울 사진을 골라 주세요.");
  if (picked.size > MAX_DELETE) back(slug, `한 번에 ${MAX_DELETE}장까지 지울 수 있습니다.`);
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) back(slug, "몰을 찾을 수 없습니다.");
  const { data: files, error } = await supabase.rpc("mall_builder_store_files", { p_store: store!.id });
  if (error) back(slug, error.message);
  const names = ((files ?? []) as { name: string; deletable: boolean }[]).filter((f) => f.deletable && picked.has(f.name)).map((f) => f.name);
  if (!names.length) back(slug, "고른 사진이 그사이 다시 쓰이게 되어 지우지 않았습니다.");
  const { data: removed, error: rmError } = await supabase.storage.from(BUCKET).remove(names);
  if (rmError) back(slug, `지우기 실패: ${rmError.message}`);
  // 권한이 모자라면 저장소가 오류 없이 빈 목록을 돌려준다 — 0장이면 성공으로 보이지 않게 한다
  if (!removed?.length) back(slug, "사진을 지우지 못했습니다. 잠시 뒤 다시 해 보시고, 계속되면 알려 주세요.");
  const skipped = picked.size - (removed?.length ?? 0);
  back(slug, undefined, `사진 ${removed?.length ?? 0}장을 지웠습니다.${skipped > 0 ? ` (${skipped}장은 지금 쓰이고 있거나 이미 없어 남겨 두었습니다)` : ""}`);
}
