"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { getInstagramAuthorizeUrl } from "@/lib/instagram/client";
import { PENDING_INSTAGRAM_CONNECTION_COOKIE, type PendingInstagramConnection } from "@/lib/instagram/pendingConnection";

export async function connectInstagramAccountAction() {
  const user = await requireProgramAccess();
  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용)
  const authorizeUrl = getInstagramAuthorizeUrl(user.id);
  redirect(authorizeUrl);
}

/** accounts/select 화면에서 사용자가 페이지를 확정 선택했을 때만 실제로 DB에 저장한다. */
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
