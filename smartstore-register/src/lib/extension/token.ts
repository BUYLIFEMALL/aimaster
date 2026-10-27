import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/access";

// 크롬 확장 연결 — 웹에서 8자리 연결 번호(10분) 발급 → 확장이 번호를 내고 토큰을 받음.
// 토큰 원문은 확장에만 있고, DB에는 sha256 해시만 둔다. 모든 확장 API는 토큰 → 회원 → 이용 권한까지 다시 확인한다.

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
export const TOKENS = "smartstore_register_ext_tokens";

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const newPairCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();
export const newToken = () => crypto.randomBytes(32).toString("hex");

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer ([a-f0-9]{64})$/);
  return m ? m[1] : null;
}

/** 연결된 회원 이메일(확장 상태 창·웹 화면에 「어느 계정과 연결됐는지」 보여 주기용) */
export async function emailOf(userId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("profiles").select("email").eq("id", userId).maybeSingle();
  return (data as { email?: string | null } | null)?.email ?? null;
}

/** 확장 요청의 토큰으로 회원을 찾고 이용 권한까지 확인한다. */
export async function userFromExtension(req: Request): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: "확장 연결이 필요합니다." };
  const admin = createAdminClient();
  const { data } = await admin.from(TOKENS).select("id,user_id").eq("token_hash", hashToken(token)).maybeSingle();
  if (!data) return { ok: false, status: 401, error: "연결이 끊어졌습니다. 프로그램 「확장 연결」에서 다시 연결해 주세요." };
  const access = await checkProgramAccess(admin as unknown as SupabaseLike, data.user_id, THIS_PROGRAM_SLUG);
  if (!access.allowed) return { ok: false, status: 403, error: "이 프로그램의 이용 권한이 없습니다." };
  await admin.from(TOKENS).update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return { ok: true, userId: data.user_id };
}
