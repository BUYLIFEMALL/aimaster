"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getThreadsAuthorizeUrl } from "@/lib/threads/client";

export async function connectThreadsAccountAction() {
  const user = await requireUser();
  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용)
  const authorizeUrl = getThreadsAuthorizeUrl(user.id);
  redirect(authorizeUrl);
}

export async function disconnectThreadsAccountAction() {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase.from("threads_accounts").delete().eq("user_id", user.id);

  revalidatePath("/accounts");
}
