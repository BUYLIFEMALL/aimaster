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

export async function revokeExtensionToken(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const service = createServiceClient();
  const { error } = await service.from("personal_access_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG);
  return error ? { error: error.message } : { ok: true };
}
