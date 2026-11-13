// 이용 권한 판정(Next 의존 없음 — 시험에서 가짜 DB로 확인, tests/access.test.mjs).
// 판정 순서(모든 프로그램 공통): 정지 → 관리자 → 핸드폰 → FREE 배지 → 결제 구독 → (최소 등급 없음) → 등급 ≥ 최소 등급 + 사용기간.
export type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const THIS_PROGRAM_SLUG = "wp-blogger-auto";
const isNotExpired = (expiresAt: string | null) => !expiresAt || new Date(expiresAt) > new Date();
/** 핸드폰 번호 필수 정책(2026-10-12): 010·011·016·017·018·019만 유효. */
const hasMobilePhone = (v: unknown) => typeof v === "string" && /^01[016789]\d{7,8}$/.test(v.replace(/[^0-9]/g, ""));

export type Verdict = { ok: true } | { ok: false; reason: "suspended" | "phone" | "program" | "denied" };

export async function evaluateAccess(userId: string, db: Db): Promise<Verdict> {
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

