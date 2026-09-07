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
 * POST — 개별 사용자에게 프로그램 접근 부여.
 * program_id(단일) 또는 program_ids(배열) 중 하나를 받는다 — 배열이면 여러 프로그램에
 * 동일한 expires_at을 한 번에 적용한다(회원 목록의 "사용만료기간 설정" 모달에서
 * 프로그램을 다중 선택할 수 있게 하기 위해 추가, 기존 단일 program_id 호출부는 그대로 동작).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user_id, program_id, program_ids, expires_at } = await req.json();
  const targetProgramIds: string[] = Array.isArray(program_ids)
    ? program_ids
    : program_id
      ? [program_id]
      : [];

  if (!user_id || targetProgramIds.length === 0)
    return NextResponse.json({ error: "user_id와 program_id(또는 program_ids) 필수" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.from("user_program_access").upsert(
    targetProgramIds.map((pid) => ({
      user_id,
      program_id: pid,
      granted_by: auth.user.id,
      expires_at: expires_at ?? null,
    })),
    { onConflict: "user_id,program_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
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
