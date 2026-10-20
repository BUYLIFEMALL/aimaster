"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteSharedKakaoAccount } from "@/lib/kakao/memberAccount";
import { requireProgramAccess } from "@/lib/access";
import { getKakaoAuthorizeUrl } from "@/lib/kakao/client";
import { KAKAO_REDIRECT_FOR, type CallbackMode } from "@/lib/oauthRedirect";
import { resolveKakaoAppCredentials } from "@/lib/kakao/account";

export async function connectKakaoAccountAction() {
  await startKakaoOAuth("old");
}

// 회원 카카오 앱에 새 콜백 주소를 등록한 경우 — 새 주소로 인증(옛 vercel.app 삭제 대비 두 주소 동시 지원)
export async function connectKakaoAccountNewCallbackAction() {
  await startKakaoOAuth("new");
}

async function startKakaoOAuth(callbackMode: CallbackMode) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  // 카카오 앱이 "비즈니스 앱 전환" 심사를 받지 않은 동안은 그 앱의 테스터로 등록된 계정만
  // OAuth를 완료할 수 있어, 앱(운영자) 공용 카카오 앱 하나로는 운영자 본인 외 다른 회원이
  // 연결할 수 없다. 회원 각자 본인이 만든 카카오 앱의 REST API 키를 등록해야 연결을
  // 시작할 수 있다(threads의 meta_app_id 전환과 동일한 BYOK 패턴, 2026-09-16).
  const credentials = await resolveKakaoAppCredentials(supabase, user.id);
  if (!credentials) {
    redirect("/settings?error=kakao_app_missing");
  }

  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용) —
  // threads/src/lib/actions/accounts.ts와 동일한 패턴.
  const authorizeUrl = getKakaoAuthorizeUrl(user.id, credentials.restApiKey, KAKAO_REDIRECT_FOR(callbackMode));
  redirect(authorizeUrl);
}

export async function disconnectKakaoAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("user_kakao_accounts").delete().eq("user_id", user.id);
  // v1.24: 공용 연결 계정도 함께 해제(남겨 두면 해제해도 계속 연결된 상태로 보임)
  await deleteSharedKakaoAccount(user.id);

  revalidatePath("/settings");
}
