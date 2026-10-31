import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { programAccessUserIds } from "@/lib/accessBatch";

const THIS_PROGRAM_SLUG = "commercial-land-trade-alert";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

const hasMobilePhone = (v: unknown): boolean => typeof v === "string" && /^01[016789]\d{7,8}$/.test(v.replace(/[^0-9]/g, ""));

type Verdict = "ok" | "suspended" | "need_phone" | "no_access";

// 권한 표는 서비스 키로 읽는다(RLS·쿠키 때문에 권한 있는 회원이 튕기는 사고 방지, 핵심 원칙 6).
// 판정 순서: 정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간
async function judge(userId: string): Promise<Verdict> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: profile } = await admin.from("profiles").select("is_suspended, is_admin, phone").eq("id", userId).maybeSingle();
  if (profile?.is_suspended) return "suspended";
  if (profile?.is_admin) {
    const allowed = await programAccessUserIds(admin, THIS_PROGRAM_SLUG, [userId]);
    return allowed.has(userId) ? "ok" : "no_access";
  }
  if (!hasMobilePhone(profile?.phone)) return "need_phone";
  const allowed = await programAccessUserIds(admin, THIS_PROGRAM_SLUG, [userId]);
  return allowed.has(userId) ? "ok" : "no_access";
}

export async function requireProgramAccess() {
  const user = await requireUser();
  const verdict = await judge(user.id);
  if (verdict === "ok") return user;
  if (verdict === "need_phone") redirect(`${MAIN_SITE_URL}/settings?need_phone=1`);
  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}${verdict === "suspended" ? "?error=suspended" : ""}`);
}

export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** API용: 이동시키지 않고 결과만 돌려준다 */
export async function checkProgramAccessApi(): Promise<{ allowed: true; userId: string } | { allowed: false; status: number; error: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { allowed: false, status: 401, error: "로그인이 필요합니다." };
  const verdict = await judge(data.user.id);
  if (verdict === "ok") return { allowed: true, userId: data.user.id };
  return { allowed: false, status: 403, error: "이 프로그램을 사용할 권한이 없습니다." };
}
