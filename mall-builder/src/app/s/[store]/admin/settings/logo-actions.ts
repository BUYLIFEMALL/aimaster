"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appLogoOf } from "@/lib/pwa";

export type LogoState = { error: string | null; message: string | null };

// D32 몰 로고(앱 아이콘) — 몰 설정 settings.app_logo. 이 서비스 저장소 공개 주소만, 대표만 고칠 수 있다(보안 규칙·트리거)
export async function saveLogoAction(slug: string, url: string): Promise<LogoState> {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id, settings").eq("slug", slug).maybeSingle();
  if (!store) return { error: "몰을 찾을 수 없습니다.", message: null };
  const base = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "")}/storage/v1/object/public/mall-builder-public/${store.id}/logo/`;
  if (url && (!url.startsWith(base) || !appLogoOf({ app_logo: url }))) return { error: "이 몰에 올린 그림만 로고로 쓸 수 있습니다.", message: null };
  const settings = { ...((store.settings as Record<string, unknown> | null) ?? {}), app_logo: url };
  const { data, error } = await supabase.from("mall_builder_stores").update({ settings }).eq("id", store.id).select("id");
  if (error) return { error: error.message, message: null };
  if (!data?.length) return { error: "대표 운영자만 로고를 바꿀 수 있습니다.", message: null };
  revalidatePath(`/s/${slug}`, "layout");
  return { error: null, message: url ? "로고를 저장했습니다. 홈 화면 아이콘에 이 그림이 쓰입니다(이미 설치한 손님은 다시 설치해야 바뀔 수 있습니다)." : "로고를 지웠습니다. 몰 이름 첫 글자 아이콘으로 돌아갑니다." };
}
