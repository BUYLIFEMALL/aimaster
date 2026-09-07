"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { resolveApiKey, PROVIDER_LABELS } from "@/lib/apiKeys";
import { getFacebookAuthorizeUrl, getInstagramAuthorizeUrl } from "@/lib/instagram/client";
import { PENDING_INSTAGRAM_CONNECTION_COOKIE, type PendingInstagramConnection } from "@/lib/instagram/pendingConnection";
import type { InstagramAuthMethod } from "@/types/database.types";

/**
 * 인스타그램 연결을 시작한다. formData의 hidden "method" 필드로 방식을 고른다.
 * - facebook_login(기본): 운영자 공용 앱으로 바로 연결 — 별도 등록 불필요.
 * - instagram_login(대체): 회원 본인 Meta 앱(App ID/Secret)이 등록되어 있어야 한다.
 */
export async function connectInstagramAccountAction(formData: FormData) {
  const user = await requireProgramAccess();
  const method = (String(formData.get("method") ?? "facebook_login") as InstagramAuthMethod);

  if (method === "instagram_login") {
    const supabase = await createClient();
    const appId = await resolveApiKey(supabase, user.id, "meta_app_id");
    if (!appId) {
      redirect(
        `/accounts?error=connect_failed&reason=${encodeURIComponent(
          `${PROVIDER_LABELS.meta_app_id}가 없습니다. 설정 페이지에서 본인 Meta 앱을 먼저 등록해주세요.`,
        )}`,
      );
    }
    // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용)
    redirect(getInstagramAuthorizeUrl(user.id, appId));
  }

  redirect(getFacebookAuthorizeUrl(user.id));
}

/** accounts/select 화면에서 사용자가 페이지를 확정 선택했을 때만 실제로 DB에 저장한다(facebook_login 전용). */
export async function confirmInstagramAccountAction(formData: FormData) {
  const user = await requireProgramAccess();
  const pageId = String(formData.get("pageId") ?? "");
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_INSTAGRAM_CONNECTION_COOKIE)?.value;

  if (!raw) {
    redirect(`/accounts?error=connect_failed&reason=${encodeURIComponent("연결 세션이 만료되었습니다. 다시 시도해주세요.")}`);
  }

  let pending: PendingInstagramConnection;
  try {
    pending = JSON.parse(raw);
  } catch {
    cookieStore.delete(PENDING_INSTAGRAM_CONNECTION_COOKIE);
    redirect(`/accounts?error=connect_failed&reason=${encodeURIComponent("연결 세션을 해석하지 못했습니다. 다시 시도해주세요.")}`);
  }

  const chosen = pending.candidates.find((c) => c.pageId === pageId);
  if (!chosen) {
    redirect(`/accounts?error=connect_failed&reason=${encodeURIComponent("선택한 페이지를 찾지 못했습니다. 다시 시도해주세요.")}`);
  }

  const tokenExpiresAt = new Date(Date.now() + pending.expiresInSeconds * 1000).toISOString();
  const supabase = await createClient();
  const { error } = await supabase.from("insta_accounts").upsert(
    {
      user_id: user.id,
      ig_user_id: chosen.igUserId,
      ig_username: chosen.igUsername,
      page_id: chosen.pageId,
      auth_method: "facebook_login",
      access_token: pending.accessToken,
      token_expires_at: tokenExpiresAt,
    },
    { onConflict: "user_id" },
  );

  cookieStore.delete(PENDING_INSTAGRAM_CONNECTION_COOKIE);

  if (error) {
    redirect(`/accounts?error=connect_failed&reason=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/accounts");
  redirect("/accounts?connected=1");
}

export async function disconnectInstagramAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("insta_accounts").delete().eq("user_id", user.id);

  revalidatePath("/accounts");
}
