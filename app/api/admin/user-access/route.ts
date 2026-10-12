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

  const { user_id, user_ids, program_id, program_ids, expires_at } = await req.json();
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

  const rows = targetUserIds.flatMap((uid) =>
    targetProgramIds.map((pid) => ({
      user_id: uid,
      program_id: pid,
      granted_by: auth.user.id,
      expires_at: expires_at ?? null,
    })),
  );

  const service = createServiceClient();
  const { error } = await service
    .from("user_program_access")
    .upsert(rows, { onConflict: "user_id,program_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: rows.length }, { status: 201 });
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
