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
