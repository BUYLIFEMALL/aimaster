import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PROGRAM_SLUG = "video-to-gif";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";
type QueryClient = Awaited<ReturnType<typeof createClient>>;
type AccessResult = { allowed: true } | { allowed: false; reason: "suspended" | "phone_required" | "not_entitled" | "not_configured" };

function isNotExpired(value: string | null | undefined) { return !value || new Date(value) > new Date(); }

/** 핸드폰 번호 필수 정책(2026-10-12): 핸드폰(010·011·016·017·018·019)만 유효. 루트 lib/utils/phone.ts 와 같은 규칙. */
const hasMobilePhone = (v: unknown): boolean => typeof v === "string" && /^01[016789]\d{7,8}$/.test(v.replace(/[^0-9]/g, ""));

async function evaluateAccess(supabase: QueryClient, userId: string): Promise<AccessResult> {
  const { data: profile } = await supabase.from("profiles").select("is_admin,is_suspended,grade_id,phone").eq("id", userId).maybeSingle();
  if (profile?.is_suspended) return { allowed: false, reason: "suspended" };
  // 핸드폰 번호 필수 정책(2026-10-12): 번호가 없으면 FREE 프로그램 포함 모두 차단(관리자 제외).
  if (!profile?.is_admin && !hasMobilePhone(profile?.phone)) return { allowed: false, reason: "phone_required" };
  if (profile?.is_admin) return { allowed: true };
  const { data: program } = await supabase.from("programs").select("id, required_grade_id, badges").eq("slug", PROGRAM_SLUG).eq("is_active", true).maybeSingle();
  if (!program) return { allowed: false, reason: "not_configured" };
  const { data: subscriptions } = await supabase.from("subscriptions").select("status,expires_at").eq("user_id", userId).eq("program_id", program.id);
  if ((subscriptions ?? []).some((item: { status: string; expires_at: string | null }) => item.status === "active" && isNotExpired(item.expires_at))) return { allowed: true };
  if ((program.badges ?? []).includes("free")) return { allowed: true };
  const { data: grant } = await supabase.from("user_program_access").select("expires_at").eq("user_id", userId).eq("program_id", program.id).maybeSingle();
  if (!program.required_grade_id) return { allowed: true };
  const { data: userGrade } = await supabase.from("member_grades").select("sort_order").eq("id", profile?.grade_id ?? "").maybeSingle();
  const { data: requiredGrade } = await supabase.from("member_grades").select("sort_order").eq("id", program.required_grade_id).maybeSingle();
  if (userGrade && requiredGrade && userGrade.sort_order >= requiredGrade.sort_order && grant && isNotExpired(grant.expires_at)) return { allowed: true };
  return { allowed: false, reason: "not_entitled" };
}

export async function requireProgramAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/dashboard`);
  const result = await evaluateAccess(supabase, user.id);
  if (!result.allowed && result.reason === "phone_required") redirect(`${MAIN_SITE_URL}/settings?need_phone=1`);
  if (!result.allowed) redirect(`${MAIN_SITE_URL}/programs/${PROGRAM_SLUG}?error=${result.reason}`);
  return user;
}
