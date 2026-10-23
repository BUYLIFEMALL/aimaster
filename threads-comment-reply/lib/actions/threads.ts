"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { buildOAuthState } from "@/lib/oauthState";
import { redirectUriFor, type CallbackMode } from "@/lib/oauthRedirect";
import { getThreadsAuthorizeUrl } from "@/lib/threads/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { deleteSharedThreadsAccount, getReplyAccount } from "@/lib/threads/memberAccount";
import { getValidThreadsAccessToken } from "@/lib/threads/token";

export interface ConnectThreadsState {
  error?: string;
}

export async function connectThreadsAction(
  _prevState: ConnectThreadsState,
  formData: FormData,
): Promise<ConnectThreadsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const appId = await resolveApiKey(supabase, user.id, "threads_app_id");
  if (!appId) {
    return { error: "설정 페이지에서 Meta App ID를 먼저 등록해주세요." };
  }
  const returnTo = String(formData.get("returnTo") ?? "");
  // 기본은 회원 앱에 예전부터 등록된 옛 콜백, [새 주소로 연결]을 누르면 새 콜백으로 인증한다(두 주소 동시 지원)
  const mode: CallbackMode = formData.get("callback") === "new" ? "new" : "old";
  redirect(getThreadsAuthorizeUrl(buildOAuthState(user.id, returnTo), appId, redirectUriFor(mode)));
}

export async function disconnectThreadsAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("th_accounts").delete().eq("user_id", user.id);
  // v1.13: 공용 연결 계정도 함께 해제(남겨 두면 해제해도 계속 연결된 상태로 보임)
  await deleteSharedThreadsAccount(user.id);
  revalidatePath("/settings");
}



/** 실제 API 호출 없이, DB에 저장된 최근 점검 결과만 빠르게 읽는다(모든 화면 상단 배너용). */
export async function getPersistedConnectionFlag(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ connected: boolean; needsReconnect: boolean }> {
  // v1.13: 공용 연결 계정(댓글 권한 있는 것) → 없으면 이 프로그램 표
  const data = await getReplyAccount(supabase, userId);
  if (!data) return { connected: false, needsReconnect: false };
  return { connected: true, needsReconnect: data.needs_reconnect };
}

export interface ThreadsConnectionStatus {
  connected: boolean;
  username: string | null;
  needsReconnect: boolean;
}

export async function getThreadsConnectionStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ThreadsConnectionStatus> {
  const account = await getReplyAccount(supabase, userId);
  if (!account) return { connected: false, username: null, needsReconnect: false };

  try {
    await getValidThreadsAccessToken(supabase, userId, account);
    return { connected: true, username: account.username, needsReconnect: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: true, username: account.username, needsReconnect: message === "THREADS_RECONNECT_REQUIRED" };
  }
}
