// RE-P2(2026-10-26): 예약 수집·분석·알림처럼 로그인 화면 없이 도는 일에서도 「이 프로그램을 쓸 권한이 있는 회원인가」를 확인한다.
// 판정 순서는 화면 접속용 requireProgramAccess(lib/access.ts)와 같다: 관리자 → FREE 배지 → 결제 구독 → (최소 등급 없음이면 허용) → 등급 ≥ 최소 등급 그리고 사용기간.
// 정지·핸드폰 확인은 부르는 쪽(dispatch)이 이미 한다. 이 파일은 다른 모듈을 불러오지 않아 node --test로 바로 시험할 수 있다.

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type AccessFacts = {
  isAdmin: boolean;
  free: boolean;
  requiredGradeOrder: number | null; // 프로그램 최소 등급(sort_order), 없으면 null
  gradeOrder: number | null; // 회원 등급(sort_order)
  subs: { status: string; expires_at: string | null }[];
  grantExpiresAt: string | null | undefined; // undefined = 개별 부여 없음, null = 무기한
};

const notExpired = (expiresAt: string | null, now: Date) => !expiresAt || new Date(expiresAt) > now;

/** 한 회원의 이용 권한 판정(순수 함수) */
export function evaluateAccess(f: AccessFacts, now = new Date()): boolean {
  if (f.isAdmin || f.free) return true;
  if (f.subs.some((s) => s.status === "active" && notExpired(s.expires_at, now))) return true;
  if (f.requiredGradeOrder === null) return true;
  return f.gradeOrder !== null && f.gradeOrder >= f.requiredGradeOrder && f.grantExpiresAt !== undefined && notExpired(f.grantExpiresAt, now);
}

/** 여러 회원을 한 번에 판정해 권한 있는 회원 id만 돌려준다(서비스 키 클라이언트). 프로그램 행이 없으면 아무도 허용하지 않는다. */
export async function programAccessUserIds(client: SupabaseLike, programSlug: string, userIds: string[], now = new Date()): Promise<Set<string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Set();
  const { data: program } = await client.from("programs").select("id, required_grade_id, badges").eq("slug", programSlug).eq("is_active", true).maybeSingle();
  if (!program) return new Set();
  const [{ data: profiles }, { data: subs }, { data: grants }, { data: grades }] = await Promise.all([
    client.from("profiles").select("id, is_admin, grade_id").in("id", ids),
    client.from("subscriptions").select("user_id, status, expires_at").eq("program_id", program.id).in("user_id", ids),
    client.from("user_program_access").select("user_id, expires_at").eq("program_id", program.id).in("user_id", ids),
    client.from("member_grades").select("id, sort_order"),
  ]);
  const orderOf = new Map<string, number>(((grades ?? []) as { id: string; sort_order: number }[]).map((g) => [g.id, g.sort_order]));
  const required = program.required_grade_id ? orderOf.get(program.required_grade_id) ?? Number.POSITIVE_INFINITY : null;
  const free = ((program.badges ?? []) as string[]).includes("free");
  const out = new Set<string>();
  for (const p of (profiles ?? []) as { id: string; is_admin: boolean | null; grade_id: string | null }[]) {
    const grant = ((grants ?? []) as { user_id: string; expires_at: string | null }[]).find((g) => g.user_id === p.id);
    const ok = evaluateAccess({
      isAdmin: !!p.is_admin,
      free,
      requiredGradeOrder: required,
      gradeOrder: p.grade_id ? orderOf.get(p.grade_id) ?? null : null,
      subs: ((subs ?? []) as { user_id: string; status: string; expires_at: string | null }[]).filter((s) => s.user_id === p.id),
      grantExpiresAt: grant ? grant.expires_at : undefined,
    }, now);
    if (ok) out.add(p.id);
  }
  return out;
}
