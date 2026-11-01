import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";

// 공용 DB 타입에 없는 표를 쓰므로 from()만 느슨하게 받는다(lib/access.ts와 같은 방식).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };

const PROGRAM_SLUG = "trending-product-finder";

export function hashExtensionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** 확장이 보낸 연결 코드를 확인하고, 그 회원의 현재 이용 권한까지 판정한다. */
export async function verifyExtensionToken(request: Request): Promise<{ userId: string; email: string | null } | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const admin = createAdminClient() as unknown as SupabaseLike;
  const { data: row } = await admin
    .from("personal_access_tokens")
    .select("id, user_id")
    .eq("token_hash", hashExtensionToken(token))
    .eq("program_slug", PROGRAM_SLUG)
    .is("revoked_at", null)
    .maybeSingle();
  if (!row) return null;

  const access = await checkProgramAccess(admin, row.user_id, PROGRAM_SLUG);
  if (!access.allowed) return null;

  await admin.from("personal_access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  const { data: profile } = await admin.from("profiles").select("email").eq("id", row.user_id).maybeSingle();
  return { userId: row.user_id, email: profile?.email ?? null };
}
