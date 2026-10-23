"use server";

import { INSTAGRAM_REDIRECT_FOR, type CallbackMode } from "@/lib/dmApp/oauthRedirect";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/dmApp/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { buildOAuthState } from "@/lib/oauthState";
import { getInstagramAuthorizeUrl } from "@/lib/dmApp/instagram/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { deleteSharedInstagramAccount, getDmAccount } from "@/lib/dmApp/instagram/memberAccount";
import { getValidInstagramAccessToken } from "@/lib/dmApp/instagram/token";

export interface ConnectInstagramState {
  error?: string;
}

export async function connectInstagramAction(
  _prevState: ConnectInstagramState,
  formData: FormData,
): Promise<ConnectInstagramState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const appId = await resolveApiKey(supabase, user.id, "meta_app_id");
  if (!appId) {
    return { error: "설정 페이지에서 Meta App ID를 먼저 등록해주세요." };
  }
  const returnTo = String(formData.get("returnTo") ?? "");
  // 기본은 회원 앱에 예전부터 등록된 옛 콜백, [새 주소로 연결]을 누르면 새 콜백으로 인증한다(두 주소 동시 지원)
  const callbackMode: CallbackMode = formData.get("callback") === "new" ? "new" : "old";
  redirect(getInstagramAuthorizeUrl(buildOAuthState(user.id, returnTo), appId, INSTAGRAM_REDIRECT_FOR(callbackMode)));
}

export async function disconnectInstagramAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("dm_accounts").delete().eq("user_id", user.id);
  // v1.16: 공용 연결 계정도 함께 해제(남겨 두면 해제해도 계속 연결된 상태로 보임)
  await deleteSharedInstagramAccount(user.id);
  revalidatePath("/dm/settings");
}



/** 실제 API 호출 없이, DB에 저장된 최근 점검 결과만 빠르게 읽는다(모든 화면 상단 배너용). */
export async function getPersistedConnectionFlag(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ connected: boolean; needsReconnect: boolean }> {
  // v1.16: 공용 연결 계정(DM 권한 있는 것) → 없으면 이 프로그램 표
  const data = await getDmAccount(supabase, userId);
  if (!data) return { connected: false, needsReconnect: false };
  return { connected: true, needsReconnect: data.needs_reconnect };
}

export interface InstagramConnectionStatus {
  connected: boolean;
  username: string | null;
  needsReconnect: boolean;
}

export async function getInstagramConnectionStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<InstagramConnectionStatus> {
  const account = await getDmAccount(supabase, userId);
  if (!account) return { connected: false, username: null, needsReconnect: false };

  try {
    await getValidInstagramAccessToken(supabase, userId, account);
    return { connected: true, username: account.username, needsReconnect: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: true, username: account.username, needsReconnect: message === "INSTAGRAM_RECONNECT_REQUIRED" };
  }
}
