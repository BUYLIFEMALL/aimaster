"use server";

import crypto from "node:crypto";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

const PROGRAM_SLUG = "threads-content-ops";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getAuthorizedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const access = await checkProgramAccess(supabase, user.id, PROGRAM_SLUG);
  return access.allowed ? user : null;
}

export async function createThreadsContentOpsToken(
  label: string
): Promise<{ token: string; id: string; createdAt: string } | { error: string }> {
  const user = await getAuthorizedUser();
  if (!user) return { error: "프로그램 이용 권한을 확인할 수 없습니다." };

  const rawToken = `pat_${crypto.randomBytes(32).toString("hex")}`;
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("personal_access_tokens")
    .insert({
      user_id: user.id,
      program_slug: PROGRAM_SLUG,
      label: label || null,
      token_hash: hashToken(rawToken),
    })
    .select("id, created_at")
    .single();

  if (error) return { error: "연동 토큰을 발급하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  return { token: rawToken, id: data.id, createdAt: data.created_at };
}

export async function revokeThreadsContentOpsToken(id: string): Promise<{ ok: true } | { error: string }> {
  const user = await getAuthorizedUser();
  if (!user) return { error: "프로그램 이용 권한을 확인할 수 없습니다." };

  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("personal_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("program_slug", PROGRAM_SLUG);

  if (error) return { error: "연동 토큰을 폐기하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  return { ok: true };
}
