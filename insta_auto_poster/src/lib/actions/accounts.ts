"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { resolveApiKey, PROVIDER_LABELS } from "@/lib/apiKeys";
import { getInstagramAuthorizeUrl } from "@/lib/instagram/client";

export async function connectInstagramAccountAction() {
  const user = await requireProgramAccess();
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
  const authorizeUrl = getInstagramAuthorizeUrl(user.id, appId);
  redirect(authorizeUrl);
}

export async function disconnectInstagramAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("insta_accounts").delete().eq("user_id", user.id);

  revalidatePath("/accounts");
}
