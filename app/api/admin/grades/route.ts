import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** 관리자 권한 확인 헬퍼 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "인증 필요", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "관리자 권한 필요", status: 403 };
  return { supabase, user };
}

/** POST — 등급 생성 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );

  const { name, slug, color, sort_order, max_programs } = await req.json();
  if (!name || !slug) {
    return NextResponse.json(
      { error: "이름과 슬러그는 필수입니다" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("member_grades")
    .insert({ name, slug, color: color || null, sort_order: sort_order ?? 0, max_programs: max_programs ?? null })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

/** PUT — 등급 수정 */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );

  const { id, name, slug, color, sort_order, max_programs } = await req.json();
  if (!id)
    return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("member_grades")
    .update({ name, slug, color: color || null, sort_order, max_programs: max_programs ?? null })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

/** DELETE — 등급 삭제 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );

  const { id } = await req.json();
  if (!id)
    return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  // 해당 등급을 사용하는 회원 수 확인. profiles RLS는 본인 행만 조회 가능해서(admin-all
  // SELECT 정책 없음) 세션 클라이언트로는 다른 회원의 등급 사용 여부를 볼 수 없어
  // 이 안전장치가 항상 0으로 나올 수 있다 — service 클라이언트로 정확히 센다.
  const service = createServiceClient();
  const { count } = await service
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("grade_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `이 등급을 사용 중인 회원이 ${count}명 있습니다. 먼저 회원의 등급을 변경해주세요.` },
      { status: 409 }
    );
  }

  const { error } = await auth.supabase
    .from("member_grades")
    .delete()
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
