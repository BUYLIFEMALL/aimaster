"use server";

import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const PROGRAM_SLUG = "naver-blog-seo-studio";

export async function createExtensionToken(label: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const rawToken = `pat_${crypto.randomBytes(32).toString("hex")}`;
  const service = createServiceClient();
  const { data, error } = await service.from("personal_access_tokens").insert({
    user_id: user.id,
    program_slug: PROGRAM_SLUG,
    label: label.trim() || "SEO Studio Chrome 확장",
    token_hash: crypto.createHash("sha256").update(rawToken).digest("hex"),
  }).select("id, created_at").single();
  if (error) return { error: error.message };
  return { token: rawToken, id: data.id, createdAt: data.created_at };
}

// 2026-10-23: 자동 연결이 성공한 뒤, 같은 회원의 다른 「확장 자동 연결」 코드 중 한 번도 쓰이지 않았거나 30일 넘게 안 쓰인 것만 폐기한다
// (다른 PC·브라우저에서 쓰고 있는 코드와 직접 발급한 코드는 그대로 둔다).
export async function retireStaleAutoTokens(keepId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const { error } = await createServiceClient().from("personal_access_tokens").update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).is("revoked_at", null).like("label", "확장 자동 연결%").neq("id", keepId)
    .or(`last_used_at.is.null,last_used_at.lt.${cutoff}`);
  return error ? { error: error.message } : { ok: true };
}

export async function revokeExtensionToken(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const service = createServiceClient();
  const { error } = await service.from("personal_access_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG);
  return error ? { error: error.message } : { ok: true };
}
