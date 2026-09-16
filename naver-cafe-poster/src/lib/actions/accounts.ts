"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { getNaverAuthorizeUrl } from "@/lib/naver/client";
import { resolveNaverAppCredentials } from "@/lib/naver/account";

export async function connectNaverAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  // 네이버 로그인도 앱이 네이버 검수를 통과하지 않은 동안은 그 앱에 테스터로 등록된 계정만
  // OAuth를 완료할 수 있어, 앱(운영자) 공용 네이버 앱 하나로는 운영자 본인 외 다른 회원이
  // 연결할 수 없다. 회원 각자 본인이 만든 네이버 앱의 Client ID/Secret을 등록해야 연결을
  // 시작할 수 있다(kakao_auto_poster의 kakao_rest_api_key 전환과 동일한 BYOK 패턴, 2026-09-16).
  const credentials = await resolveNaverAppCredentials(supabase, user.id);
  if (!credentials) {
    redirect("/settings?error=naver_app_missing");
  }

  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용)
  const authorizeUrl = getNaverAuthorizeUrl(user.id, credentials.clientId);
  redirect(authorizeUrl);
}

export async function disconnectNaverAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("ncafe_accounts").delete().eq("user_id", user.id);

  revalidatePath("/settings");
}

export interface TargetActionState {
  error?: string;
}

export async function addCafeTargetAction(
  _prevState: TargetActionState,
  formData: FormData,
): Promise<TargetActionState> {
  const user = await requireProgramAccess();
  const label = String(formData.get("label") ?? "").trim();
  const clubId = String(formData.get("clubId") ?? "").trim();
  const menuId = String(formData.get("menuId") ?? "").trim();

  if (!label || !clubId || !menuId) {
    return { error: "카페 이름, club_id, menu_id를 모두 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ncafe_targets").insert({
    user_id: user.id,
    label,
    club_id: clubId,
    menu_id: menuId,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function updateCafeTargetAction(
  _prevState: TargetActionState,
  formData: FormData,
): Promise<TargetActionState> {
  const user = await requireProgramAccess();
  const targetId = String(formData.get("targetId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const clubId = String(formData.get("clubId") ?? "").trim();
  const menuId = String(formData.get("menuId") ?? "").trim();

  if (!targetId || !label || !clubId || !menuId) {
    return { error: "카페 이름, club_id, menu_id를 모두 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ncafe_targets")
    .update({ label, club_id: clubId, menu_id: menuId })
    .eq("id", targetId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteCafeTargetAction(formData: FormData) {
  const targetId = String(formData.get("targetId"));
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("ncafe_targets").delete().eq("id", targetId).eq("user_id", user.id);

  revalidatePath("/settings");
}
