"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { getThreadsAuthorizeUrl } from "@/lib/threads/client";
import { THREADS_REDIRECT_FOR, type CallbackMode } from "@/lib/oauthRedirect";
import { deleteSharedThreadsAccount } from "@/lib/threads/memberAccount";

export async function connectThreadsAccountAction() {
  await startThreadsOAuth("old");
}

// 회원 Meta 앱에 새 콜백 주소를 등록한 경우 — 새 주소로 인증(옛 vercel.app 삭제 대비 두 주소 동시 지원)
export async function connectThreadsAccountNewCallbackAction() {
  await startThreadsOAuth("new");
}

async function startThreadsOAuth(callbackMode: CallbackMode) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  // Meta 앱이 Development 모드인 동안은 그 앱의 Tester로 등록된 계정만 OAuth를 완료할 수
  // 있어, 앱(관리자) 공용 Meta 앱 하나로는 운영자 본인 외 다른 회원이 연결할 수 없다.
  // 이제 회원 각자 본인이 만든 Meta App ID를 등록해야 연결을 시작할 수 있다.
  const appId = await resolveApiKey(supabase, user.id, "threads_app_id");
  if (!appId) {
    redirect("/settings?error=meta_app_missing");
  }

  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용)
  const authorizeUrl = getThreadsAuthorizeUrl(user.id, appId, THREADS_REDIRECT_FOR(callbackMode));
  redirect(authorizeUrl);
}

export async function disconnectThreadsAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("threads_accounts").delete().eq("user_id", user.id);
  // v1.21: 공용 연결 계정도 함께 해제(남겨 두면 해제해도 계속 연결된 상태로 보임)
  await deleteSharedThreadsAccount(user.id);

  revalidatePath("/accounts");
}
