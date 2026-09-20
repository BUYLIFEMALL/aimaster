import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

// 데스크톱 앱이 `Authorization: Bearer <토큰>`으로 호출해서 "이 토큰이 아직 유효한지,
// 어느 계정에 연결돼 있는지"를 확인하는 용도. redirect를 쓰지 않고 JSON으로만 응답한다
// (API route는 항상 checkProgramAccessApi 스타일 — CLAUDE.md 멀티테넌시 원칙 1번 참고).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "naver-blog-auto-poster";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (!token) {
    return NextResponse.json({ error: "Authorization 헤더가 없습니다." }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const tokenHash = hashToken(token);

  const { data: tokenRow } = await serviceClient
    .from("personal_access_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .eq("program_slug", PROGRAM_SLUG)
    .is("revoked_at", null)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ error: "유효하지 않거나 폐기된 토큰입니다." }, { status: 401 });
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("email, name, is_suspended")
    .eq("id", tokenRow.user_id)
    .maybeSingle();

  if (!profile || profile.is_suspended) {
    return NextResponse.json({ error: "계정을 사용할 수 없습니다." }, { status: 403 });
  }

  await serviceClient
    .from("personal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return NextResponse.json({ email: profile.email, name: profile.name ?? null });
}
