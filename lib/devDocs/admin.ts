// 관리자 「개발 문서 관리」 API 공통 — 관리자 확인(기존 관리자 API와 같은 방식)
import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<{ userId: string } | { error: string; status: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증 필요", status: 401 };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: "관리자 권한 필요", status: 403 };
  return { userId: user.id };
}

/** 줄바꿈(CRLF/LF)을 맞춘 뒤의 해시 — CLI 반영 도구(scripts/dev-requests.mjs)와 같은 방식 */
export function contentHash(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

export const ROLE_ID_RE = /^[a-z][a-z0-9-]{1,40}$/;
