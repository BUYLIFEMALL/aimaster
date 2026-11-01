import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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

/** POST — 골드·VIP 회원에게 프리미엄 프로그램 개별 권한 부여. 조건 검사는 DB 함수가 한다. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user_id, program_ids, expires_at } = await req.json();
  if (!user_id || !Array.isArray(program_ids) || program_ids.length === 0 || !expires_at)
    return NextResponse.json({ error: "회원, 프로그램, 만료일이 필요합니다" }, { status: 400 });

  const service = createServiceClient();
  for (const programId of program_ids) {
    const { error } = await service.rpc("grant_premium_individual", {
      p_user_id: user_id,
      p_program_id: programId,
      p_expires_at: expires_at,
      p_granted_by: auth.user.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true, count: program_ids.length }, { status: 201 });
}

/** DELETE — 개별 권한 회수 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user_id, program_id } = await req.json();
  if (!user_id || !program_id)
    return NextResponse.json({ error: "user_id와 program_id 필수" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.rpc("revoke_premium_individual", {
    p_user_id: user_id,
    p_program_id: program_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
