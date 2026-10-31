import "server-only";

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { programAccessUserIds } from "@/lib/accessBatch";

const PROGRAM_SLUG = "commercial-land-trade-alert";

// 확장 연결 코드 확인. 판정 순서는 웹과 같다: 정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간
export async function verifyExtensionToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { data: row } = await db.from("personal_access_tokens").select("id, user_id").eq("token_hash", tokenHash).eq("program_slug", PROGRAM_SLUG).is("revoked_at", null).maybeSingle();
  if (!row) return null;
  const { data: p } = await db.from("profiles").select("email, is_admin, is_suspended, phone").eq("id", row.user_id).maybeSingle();
  if (!p || p.is_suspended) return null;
  if (!p.is_admin && !/^01[016789]\d{7,8}$/.test(String(p.phone ?? "").replace(/[^0-9]/g, ""))) return null;
  const allowed = await programAccessUserIds(db, PROGRAM_SLUG, [row.user_id]);
  if (!allowed.has(row.user_id)) return null;
  await db.from("personal_access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  return { userId: row.user_id as string, email: p.email as string };
}
