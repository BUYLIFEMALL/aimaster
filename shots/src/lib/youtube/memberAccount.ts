import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount } from "@/lib/memberIntegrations";
import { resolveApiKey } from "@/lib/apiKeys";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// 회원 연동 정보 공용 저장 ⑤단계(v1.22, 2026-10-20 — 루트 docs/MEMBER_INTEGRATIONS.md).
// 업로드 권한(youtube.upload·youtube.readonly)을 받은 공용 YouTube 계정이 있으면 그것을 쓰고, 없으면 이 프로그램 표(youtube_accounts)를 쓴다. 둘 다 회원 본인 값이다.
// 갱신 토큰은 발급한 Google 앱으로만 쓸 수 있어서, 공용 계정의 앱(app_ref)이 지금 등록한 google_client_id와 같을 때만 쓴다.

export const PROGRAM_SLUG = "auto-shorts-posting";
// lib/youtube/client.ts YOUTUBE_SCOPES와 같은 목록
export const YOUTUBE_UPLOAD_SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];

export type ShotsYoutubeAccount = {
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
  channel_title: string | null;
  /** 공용 계정이면 member_platform_accounts.id, 이 프로그램 표면 null */
  shared_id: string | null;
};

export async function getShotsYoutubeAccount(supabase: SupabaseClient<Database>, userId: string): Promise<ShotsYoutubeAccount | null> {
  const shared = await getMemberAccount(createAdminClient(), userId, "youtube", { needScopes: YOUTUBE_UPLOAD_SCOPES });
  if (shared.status === "ok" && !shared.account.needsReconnect && shared.account.refreshToken) {
    const clientId = await resolveApiKey(supabase, userId, "google_client_id");
    if (clientId && shared.account.appRef === clientId) {
      return {
        access_token: shared.account.accessToken,
        refresh_token: shared.account.refreshToken,
        token_expires_at: shared.account.tokenExpiresAt,
        channel_title: shared.account.username,
        shared_id: shared.account.id,
      };
    }
  }

  const { data } = await supabase
    .from("youtube_accounts")
    .select("access_token, refresh_token, token_expires_at, channel_title")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { ...data, shared_id: null } : null;
}

/** 연결 콜백에서 공용 표에도 저장(이중 기록). 실패해도 이 프로그램 연결은 그대로 — 기록만 남김 */
export async function saveSharedYoutubeAccount(input: {
  userId: string;
  channelId: string;
  channelTitle: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  clientId: string;
}) {
  const { error } = await saveMemberAccount(createAdminClient(), {
    userId: input.userId,
    platform: "youtube",
    externalId: input.channelId,
    username: input.channelTitle,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    tokenExpiresAt: input.tokenExpiresAt,
    grantedScopes: YOUTUBE_UPLOAD_SCOPES,
    appRef: input.clientId,
    connectedVia: PROGRAM_SLUG,
  });
  if (error) console.error("[shots] 공용 YouTube 연결 계정 저장 실패", error);
}

/** 연결 해제 — 공용 표의 YouTube 계정도 지운다(남겨 두면 해제해도 계속 연결된 상태로 보임) */
export async function deleteSharedYoutubeAccount(userId: string) {
  await createAdminClient().from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "youtube");
}
