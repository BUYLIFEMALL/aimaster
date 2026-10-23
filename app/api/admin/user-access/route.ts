import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증 필요", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "관리자 권한 필요", status: 403 };
  return { user };
}

/**
 * POST — 사용자(들)에게 프로그램(들) 접근 부여.
 * user_id(단일) 또는 user_ids(배열), program_id(단일) 또는 program_ids(배열)를 자유롭게
 * 조합해서 받는다 — 둘 다 배열이면 (회원 × 프로그램) 전체 조합에 동일한 expires_at을
 * 한 번의 DB 호출로 upsert한다.
 *
 * 원래는 회원이 여러 명일 때 클라이언트에서 회원마다 fetch를 따로 호출해 Promise.all로
 * 병렬 실행했는데, 회원 수가 많으면(예: 전체 선택 79명) 동시 요청이 한꺼번에 몰려 일부가
 * 조용히 실패하는 문제가 있었다(2026-09-08 발견 — "일부 회원만 사용만료기간이 반영됨").
 * 여러 회원을 한 번의 API 호출·한 번의 upsert로 처리하도록 바꿔서 이 경합 문제 자체를
 * 없앴다.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { user_id, user_ids, program_id, program_ids, expires_at, mode, extend_days } = body;
  const targetUserIds: string[] = Array.isArray(user_ids) ? user_ids : user_id ? [user_id] : [];
  const targetProgramIds: string[] = Array.isArray(program_ids)
    ? program_ids
    : program_id
      ? [program_id]
      : [];

  if (targetUserIds.length === 0 || targetProgramIds.length === 0)
    return NextResponse.json(
      { error: "user_id(또는 user_ids)와 program_id(또는 program_ids) 필수" },
      { status: 400 },
    );

  const service = createServiceClient();

  // 사람마다 다른 만료일을 계산하는 모드 (2026-10-13)
  //  - "extend": 각자의 현재 만료일(이미 지났으면 오늘)에서 extend_days 만큼 더한다. 무기한(null)은 그대로 무기한, 부여가 없던 프로그램은 오늘 + extend_days.
  //  - "anchor": 각자의 등급 지정일 + 등급 기본 기간(member_grades.default_access_days). 등급 기본 기간이 없으면 무기한.
  let rows: { user_id: string; program_id: string; granted_by: string; expires_at: string | null }[];
  if (mode === "extend" || mode === "anchor") {
    const [{ data: profs }, { data: grades }, { data: existing }] = await Promise.all([
      service.from("profiles").select("id, grade_id, grade_assigned_at, created_at").in("id", targetUserIds),
      service.from("member_grades").select("id, default_access_days"),
      service.from("user_program_access").select("user_id, program_id, expires_at").in("user_id", targetUserIds).in("program_id", targetProgramIds),
    ]);
    const daysByGrade = new Map<string, number | null>((grades ?? []).map((g: { id: string; default_access_days: number | null }) => [g.id, g.default_access_days]));
    const profById = new Map<string, { grade_id: string | null; grade_assigned_at: string | null; created_at: string }>(
      (profs ?? []).map((p: { id: string; grade_id: string | null; grade_assigned_at: string | null; created_at: string }) => [p.id, p]),
    );
    const cur = new Map<string, string | null>((existing ?? []).map((e: { user_id: string; program_id: string; expires_at: string | null }) => [`${e.user_id}:${e.program_id}`, e.expires_at]));
    const DAY = 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const addDays = Number(extend_days);
    if (mode === "extend" && (!Number.isInteger(addDays) || addDays === 0 || Math.abs(addDays) > 3650))
      return NextResponse.json({ error: "extend_days는 0이 아닌 정수(±3650 이내)여야 합니다" }, { status: 400 });

    rows = targetUserIds.flatMap((uid) =>
      targetProgramIds.map((pid) => {
        let next: string | null;
        if (mode === "extend") {
          const key = `${uid}:${pid}`;
          const had = cur.has(key);
          const prev = cur.get(key) ?? null;
          if (had && prev === null) next = null; // 무기한은 그대로
          else next = new Date(Math.max(prev ? new Date(prev).getTime() : nowMs, nowMs) + addDays * DAY).toISOString();
        } else {
          const p = profById.get(uid);
          const days = p?.grade_id ? daysByGrade.get(p.grade_id) ?? null : null;
          const base = new Date(p?.grade_assigned_at ?? p?.created_at ?? nowMs).getTime();
          next = days ? new Date(base + days * DAY).toISOString() : null;
        }
        return { user_id: uid, program_id: pid, granted_by: auth.user.id, expires_at: next };
      }),
    );
  } else {
    rows = targetUserIds.flatMap((uid) =>
      targetProgramIds.map((pid) => ({
        user_id: uid,
        program_id: pid,
        granted_by: auth.user.id,
        expires_at: expires_at ?? null,
      })),
    );
  }

  const { error } = await service
    .from("user_program_access")
    .upsert(rows, { onConflict: "user_id,program_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // 회원별 새 만료일(가장 이른 것, 모두 무기한이면 null) — 사람마다 다른 모드에서 목록 표시를 갱신하는 데 쓴다
  const perUser = new Map<string, string | null>();
  rows.forEach((r) => {
    const prev = perUser.get(r.user_id);
    if (r.expires_at === null) { if (!perUser.has(r.user_id)) perUser.set(r.user_id, null); return; }
    if (prev === undefined || prev === null || r.expires_at < prev) perUser.set(r.user_id, r.expires_at);
  });
  return NextResponse.json(
    { success: true, count: rows.length, per_user: Array.from(perUser, ([user_id, expires_at]) => ({ user_id, expires_at })) },
    { status: 201 },
  );
}

/** DELETE — 개별 사용자 프로그램 접근 제거 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user_id, program_id } = await req.json();
  if (!user_id || !program_id)
    return NextResponse.json({ error: "user_id와 program_id 필수" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service
    .from("user_program_access")
    .delete()
    .eq("user_id", user_id)
    .eq("program_id", program_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/**
 * GET ?user_ids=a,b — 회원별로 "지금 사용 가능한 프로그램" id 목록(사용만료기간 설정 팝업에서 미리 선택해 두는 용도).
 *  - 현재 유효한 부여(user_program_access: 만료 안 됨·프리미엄 정지 아님)
 *  - 자동 부여 등급(골드·VIP)이면 그 등급에 체크된 프로그램도 포함 (일반·실버는 등급 체크가 권한이 아니므로 실제 부여만)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const ids = (req.nextUrl.searchParams.get("user_ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ error: "user_ids 필수" }, { status: 400 });

  const service = createServiceClient();
  const nowIso = new Date().toISOString();
  const [{ data: profiles }, { data: grants }, { data: grades }, { data: gradeAccess }] = await Promise.all([
    service.from("profiles").select("id, grade_id").in("id", ids),
    service
      .from("user_program_access")
      .select("user_id, program_id, expires_at, premium_suspended")
      .in("user_id", ids),
    service.from("member_grades").select("id, auto_grant"),
    service.from("grade_program_access").select("grade_id, program_id").eq("can_access", true),
  ]);

  const autoGrades = new Set<string>((grades ?? []).filter((g: { auto_grant: boolean }) => g.auto_grant).map((g: { id: string }) => g.id));
  const gradePrograms = new Map<string, string[]>();
  (gradeAccess ?? []).forEach((r: { grade_id: string; program_id: string }) => {
    if (!autoGrades.has(r.grade_id)) return;
    gradePrograms.set(r.grade_id, [...(gradePrograms.get(r.grade_id) ?? []), r.program_id]);
  });

  const byUser: Record<string, string[]> = {};
  ids.forEach((id) => (byUser[id] = []));
  (grants ?? []).forEach((g: { user_id: string; program_id: string; expires_at: string | null; premium_suspended: boolean }) => {
    if (g.premium_suspended) return;
    if (g.expires_at && g.expires_at <= nowIso) return;
    byUser[g.user_id].push(g.program_id);
  });
  (profiles ?? []).forEach((p: { id: string; grade_id: string | null }) => {
    if (p.grade_id && gradePrograms.has(p.grade_id)) byUser[p.id].push(...gradePrograms.get(p.grade_id)!);
    byUser[p.id] = Array.from(new Set(byUser[p.id]));
  });
  return NextResponse.json({ by_user: byUser });
}
