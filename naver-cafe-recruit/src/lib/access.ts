import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// AIMaster 공용 DB의 programs/subscriptions/user_program_access 기준으로 「이 프로그램을 쓸 권한」까지 확인한다.
// 로그인 확인은 쿠키 세션으로, 권한 표 조회는 서비스 키(createAdminClient)로 한다 — RLS나 서브도메인 쿠키 때문에
// 권한 있는 회원이 튕기는 사고를 막는 공통 규칙(루트 CLAUDE.md 핵심 원칙 6).
// 판정 순서(모든 프로그램 공통): 정지 → 관리자 → 핸드폰 → FREE 배지 → 결제 구독 → (최소 등급 없음) → 등급 ≥ 최소 등급 + 사용기간.
type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const THIS_PROGRAM_SLUG = "naver-cafe-recruit";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";
const isNotExpired = (expiresAt: string | null) => !expiresAt || new Date(expiresAt) > new Date();
/** 핸드폰 번호 필수 정책(2026-10-12): 010·011·016·017·018·019만 유효. */
const hasMobilePhone = (v: unknown) => typeof v === "string" && /^01[016789]\d{7,8}$/.test(v.replace(/[^0-9]/g, ""));

type Verdict = { ok: true } | { ok: false; reason: "suspended" | "phone" | "program" | "denied" };

export async function evaluateAccess(userId: string): Promise<Verdict> {
  const db = createAdminClient() as unknown as Db;
  const { data: me } = await db.from("profiles").select("is_suspended, is_admin, phone, grade:member_grades(sort_order)").eq("id", userId).maybeSingle();
  if (me?.is_suspended) return { ok: false, reason: "suspended" };
  if (me?.is_admin) return { ok: true };
  if (!hasMobilePhone(me?.phone)) return { ok: false, reason: "phone" };
  const { data: program } = await db.from("programs").select("id, required_grade_id, badges").eq("slug", THIS_PROGRAM_SLUG).eq("is_active", true).maybeSingle();
  if (!program) return { ok: false, reason: "program" };
  if ((program.badges ?? []).includes("free")) return { ok: true };
  const { data: subs } = await db.from("subscriptions").select("status, expires_at").eq("user_id", userId).eq("program_id", program.id);
  if ((subs ?? []).some((s: { status: string; expires_at: string | null }) => s.status === "active" && isNotExpired(s.expires_at))) return { ok: true };
  if (!program.required_grade_id) return { ok: true };
  const { data: grant } = await db.from("user_program_access").select("expires_at").eq("user_id", userId).eq("program_id", program.id).maybeSingle();
  const { data: required } = await db.from("member_grades").select("sort_order").eq("id", program.required_grade_id).maybeSingle();
  const grade = Array.isArray(me?.grade) ? me?.grade[0] : me?.grade;
  if (grade && required && grade.sort_order >= required.sort_order && grant && isNotExpired(grant.expires_at)) return { ok: true };
  return { ok: false, reason: "denied" };
}

/** 페이지·레이아웃·Server Action용: 권한이 없으면 안내 화면으로 보낸다. */
export async function requireProgramAccess() {
  const user = await requireUser();
  const v = await evaluateAccess(user.id);
  if (v.ok) return user;
  if (v.reason === "suspended") redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  if (v.reason === "phone") redirect(`${MAIN_SITE_URL}/settings?need_phone=1`);
  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
}

/** API 라우트용: redirect 대신 결과 객체(JSON 오류 응답에 씀). */
export async function checkProgramAccessApi(): Promise<
  | { allowed: true; user: { id: string; email?: string | null } }
  | { allowed: false; error: string; status: number }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  const v = await evaluateAccess(user.id);
  if (v.ok) return { allowed: true, user };
  if (v.reason === "suspended") return { allowed: false, error: "계정이 정지되어 이용할 수 없습니다. 고객센터에 문의해주세요.", status: 403 };
  if (v.reason === "phone") return { allowed: false, error: "핸드폰 번호를 입력 후 사용해주세요!", status: 403 };
  return { allowed: false, error: "이 프로그램의 이용 권한이 필요합니다.", status: 403 };
}
