import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증 필요", status: 401 };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: "관리자 권한 필요", status: 403 };
  return { user };
}

/** GET ?grade_id= — 그 등급에 사용 가능으로 등록된 프로그램 id 목록 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const gradeId = req.nextUrl.searchParams.get("grade_id");
  if (!gradeId) return NextResponse.json({ error: "grade_id 필수" }, { status: 400 });
  const { data, error } = await createServiceClient()
    .from("grade_program_access")
    .select("program_id")
    .eq("grade_id", gradeId)
    .eq("can_access", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ program_ids: (data ?? []).map((r: { program_id: string }) => r.program_id) });
}

/**
 * POST — 등급 단위 자동 부여 설정(2026-10-13, docs/GRADE_AND_BILLING_POLICY.md).
 *  - action "policy": { grade_id, auto_grant, default_access_days } 등급의 자동 부여 켜기/끄기와 기본 사용기간(일, null=무기한)
 *  - action "apply":  { grade_id } 등급에 체크된 프로그램을 등급 회원 전원에게 부여(없는 것만 추가, 기존 부여 유지)
 *  - action "extend": { grade_id, days } 또는 { grade_id, until } 등급 회원 전원의 사용기간을 일괄 연장/지정
 * 사람별로 기간을 따로 정하는 것은 회원 관리 화면의 "사용만료기간 설정"(/api/admin/user-access)을 쓴다.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { action, grade_id } = body ?? {};
  if (!grade_id || !action) return NextResponse.json({ error: "grade_id와 action 필수" }, { status: 400 });
  const service = createServiceClient();

  // 저장 전 미리 보기: 이 목록으로 저장하면 등급 회원에게 몇 건이 새로 부여되고 몇 건이 회수되는지 계산만 한다(쓰기 없음)
  if (action === "preview") {
    const next: string[] = Array.isArray(body.program_ids) ? body.program_ids : [];
    const [{ data: cur }, { data: members }] = await Promise.all([
      service.from("grade_program_access").select("program_id").eq("grade_id", grade_id).eq("can_access", true),
      service.from("profiles").select("id").eq("grade_id", grade_id),
    ]);
    const curSet = new Set<string>((cur ?? []).map((r: { program_id: string }) => r.program_id));
    const nextSet = new Set<string>(next);
    const memberIds = (members ?? []).map((m: { id: string }) => m.id);
    const toAdd = next.filter((id) => !curSet.has(id));
    const toRemove = Array.from(curSet).filter((id) => !nextSet.has(id));

    const added: { program_id: string; new: number; already: number }[] = [];
    if (toAdd.length && memberIds.length) {
      const { data: held } = await service
        .from("user_program_access")
        .select("program_id")
        .in("program_id", toAdd)
        .in("user_id", memberIds);
      const heldCount = new Map<string, number>();
      (held ?? []).forEach((r: { program_id: string }) => heldCount.set(r.program_id, (heldCount.get(r.program_id) ?? 0) + 1));
      for (const id of toAdd) {
        const already = heldCount.get(id) ?? 0;
        added.push({ program_id: id, new: memberIds.length - already, already });
      }
    }
    const removed: { program_id: string; auto_rows: number }[] = [];
    if (toRemove.length) {
      const { data: auto } = await service
        .from("user_program_access")
        .select("program_id")
        .in("program_id", toRemove)
        .eq("grant_source", "grade")
        .eq("granted_grade_id", grade_id);
      const cnt = new Map<string, number>();
      (auto ?? []).forEach((r: { program_id: string }) => cnt.set(r.program_id, (cnt.get(r.program_id) ?? 0) + 1));
      for (const id of toRemove) removed.push({ program_id: id, auto_rows: cnt.get(id) ?? 0 });
    }
    // 이미 등급에 체크돼 있지만 아직 일부 회원에게 부여되지 않은 권한(= "지금 등급 회원 전원에 적용"을 누르면 채워지는 건수)
    const kept = next.filter((id) => curSet.has(id));
    let pending = 0;
    if (kept.length && memberIds.length) {
      const { data: heldKept } = await service
        .from("user_program_access")
        .select("program_id")
        .in("program_id", kept)
        .in("user_id", memberIds);
      pending = kept.length * memberIds.length - (heldKept ?? []).length;
    }
    return NextResponse.json({ members: memberIds.length, added, removed, pending });
  }

  // 등급의 사용 프로그램 목록을 통째로 저장: 추가분은 등급 회원에게 자동 부여, 빠진 것은 자동 부여분 회수(DB 트리거)
  if (action === "set_programs") {
    const next: string[] = Array.isArray(body.program_ids) ? body.program_ids : [];
    const { data: cur, error: curErr } = await service
      .from("grade_program_access")
      .select("program_id")
      .eq("grade_id", grade_id)
      .eq("can_access", true);
    if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });
    const curSet = new Set<string>((cur ?? []).map((r: { program_id: string }) => r.program_id));
    const nextSet = new Set<string>(next);
    const toAdd = next.filter((id) => !curSet.has(id));
    const toRemove = Array.from(curSet).filter((id) => !nextSet.has(id));
    if (toAdd.length) {
      const { error } = await service
        .from("grade_program_access")
        .upsert(toAdd.map((program_id) => ({ grade_id, program_id, can_access: true })), { onConflict: "grade_id,program_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (toRemove.length) {
      const { error } = await service.from("grade_program_access").delete().eq("grade_id", grade_id).in("program_id", toRemove);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, added: toAdd.length, removed: toRemove.length });
  }

  if (action === "policy") {
    const days = body.default_access_days;
    if (days !== null && days !== undefined && (!Number.isInteger(days) || days < 1 || days > 3650))
      return NextResponse.json({ error: "기본 사용기간은 1~3650일 정수 또는 무기한(비움)" }, { status: 400 });
    const { error } = await service
      .from("member_grades")
      .update({ auto_grant: !!body.auto_grant, default_access_days: days ?? null })
      .eq("id", grade_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "apply") {
    const { data, error } = await service.rpc("apply_grade_programs", { p_grade_id: grade_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, added: data });
  }

  if (action === "extend") {
    const hasDays = Number.isInteger(body.days) && body.days !== 0 && Math.abs(body.days) <= 3650;
    const until = body.until ? new Date(body.until) : null;
    if (!hasDays && (!until || Number.isNaN(until.getTime())))
      return NextResponse.json({ error: "연장 일수(days) 또는 만료일(until) 필요" }, { status: 400 });
    const { data, error } = await service.rpc("extend_grade_access", {
      p_grade_id: grade_id,
      p_days: hasDays ? body.days : null,
      p_until: hasDays ? null : until!.toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, updated: data });
  }

  return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
}
