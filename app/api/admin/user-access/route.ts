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

/** POST — 개별 사용자에게 프로그램 접근 부여 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user_id, program_id, expires_at } = await req.json();
  if (!user_id || !program_id)
    return NextResponse.json({ error: "user_id와 program_id 필수" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service
    .from("user_program_access")
    .upsert(
      { user_id, program_id, granted_by: auth.user.id, expires_at: expires_at ?? null },
      { onConflict: "user_id,program_id" }
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
