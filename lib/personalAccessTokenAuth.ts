import "server-only";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

// personal_access_tokens 기반 API 인증 공용 헬퍼. naver-blog-auto-poster의 whoami/generate
// 등 여러 라우트가 동일한 검증 로직을 쓰므로 한 곳에 모은다 — 향후 다른 데스크톱 앱도
// programSlug만 바꿔서 재사용한다.

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface VerifiedToken {
  userId: string;
  tokenId: string;
  email: string;
  name: string | null;
}

/** Authorization: Bearer <토큰> 헤더를 검증하고, 유효하면 계정 정보를 반환한다. */
export async function verifyPersonalAccessToken(
  request: NextRequest,
  programSlug: string
): Promise<VerifiedToken | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (!token) return null;

  const serviceClient = createServiceClient();
  const tokenHash = hashToken(token);

  const { data: tokenRow } = await serviceClient
    .from("personal_access_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .eq("program_slug", programSlug)
    .is("revoked_at", null)
    .maybeSingle();

  if (!tokenRow) return null;

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("email, name, is_suspended")
    .eq("id", tokenRow.user_id)
    .maybeSingle();

  if (!profile || profile.is_suspended) return null;

  await serviceClient
    .from("personal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return { userId: tokenRow.user_id, tokenId: tokenRow.id, email: profile.email, name: profile.name ?? null };
}
