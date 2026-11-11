"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSlug, slugError, storeNameError } from "@/lib/slug";
import { canCreateStore } from "@/lib/platform-admin";

export type CreateStoreState = { error: string | null; slug: string; name: string };

const COPY_PARTS = ["categories", "shipping", "grades", "business"] as const;

export async function createStoreAction(_prev: CreateStoreState, form: FormData): Promise<CreateStoreState> {
  const slug = normalizeSlug(String(form.get("slug") ?? ""));
  const name = String(form.get("name") ?? "").trim();
  const error = slugError(slug) ?? storeNameError(name);
  if (error) return { error, slug, name };

  const supabase = await createClient();
  // 운영(T0)에서는 관리자만 — DB 0058이 다시 막는다
  const { data: me } = await supabase.auth.getUser();
  if (!me.user || !(await canCreateStore(me.user.id))) return { error: "몰 만들기는 관리자만 할 수 있습니다.", slug, name };
  // 검사·생성은 DB 함수가 다시 한다(대표 1명당 5개 — D31, 중복·예약어). 화면 검사는 빠른 안내용
  const { data, error: dbError } = await supabase.rpc("mall_builder_create_store", { p_slug: slug, p_name: name });
  if (dbError) return { error: dbError.message, slug, name };
  const newSlug = data as string;

  // D31 새 몰을 기존 몰 설정으로 시작(고른 것만) — 몰은 이미 만들어졌으므로 실패하면 관리 화면에 안내만
  const from = String(form.get("copy_from") ?? "");
  const parts = COPY_PARTS.filter((p) => form.get(`copy_${p}`) === "on");
  if (from && parts.length) {
    const { data: created } = await supabase.from("mall_builder_stores").select("id").eq("slug", newSlug).maybeSingle();
    const { error: copyError } = created
      ? await supabase.rpc("mall_builder_copy_store_setup", { p_to: created.id, p_from: from, p_parts: parts })
      : { error: { message: "새 몰을 찾지 못했습니다." } };
    if (copyError) redirect(`/s/${newSlug}/admin?error=${encodeURIComponent(`몰은 만들었지만 설정 복사는 못 했습니다: ${copyError.message}`)}`);
    redirect(`/s/${newSlug}/admin?ok=1&msg=${encodeURIComponent("새 몰을 만들고 고른 설정을 복사했습니다.")}`);
  }
  redirect(`/s/${newSlug}/admin`);
}
