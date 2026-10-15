"use server";

// 데스크톱 앱(naver-blog-auto-poster 등)의 "웹 로그인 -> 토큰 발급 -> 앱에 붙여넣기"
// 계정 연동에 쓰는 서버 액션. 토큰은 발급 시 평문을 딱 한 번만 보여주고, DB에는 해시만
// 저장한다(비밀번호와 동일한 원칙) — personal_access_tokens 테이블은 향후 다른 데스크톱
// 앱도 program_slug만 다르게 해서 재사용한다.

import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPersonalAccessToken(
  programSlug: string,
  label: string
): Promise<{ token: string; id: string; createdAt: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const rawToken = `pat_${crypto.randomBytes(32).toString("hex")}`;
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("personal_access_tokens")
    .insert({
      user_id: user.id,
      program_slug: programSlug,
      label: label || null,
      token_hash: hashToken(rawToken),
    })
    .select("id, created_at")
    .single();

  if (error) return { error: error.message };
  return { token: rawToken, id: data.id, createdAt: data.created_at };
}

export async function revokePersonalAccessToken(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("personal_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { ok: true };
}
