"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSlug, slugError, storeNameError } from "@/lib/slug";

export type CreateStoreState = { error: string | null; slug: string; name: string };

export async function createStoreAction(_prev: CreateStoreState, form: FormData): Promise<CreateStoreState> {
  const slug = normalizeSlug(String(form.get("slug") ?? ""));
  const name = String(form.get("name") ?? "").trim();
  const error = slugError(slug) ?? storeNameError(name);
  if (error) return { error, slug, name };

  const supabase = await createClient();
  // 검사·생성은 DB 함수가 다시 한다(회원 1명당 1개, 중복·예약어). 화면 검사는 빠른 안내용
  const { data, error: dbError } = await supabase.rpc("mall_builder_create_store", { p_slug: slug, p_name: name });
  if (dbError) return { error: dbError.message, slug, name };

  redirect(`/s/${data as string}/admin`);
}
