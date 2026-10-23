import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

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

/** POST — 개별 토글 (grant/revoke) */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { grade_id, program_id, action } = await req.json();
  if (!grade_id || !program_id || !action)
    return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 });

  const service = createServiceClient();

  if (action === "grant") {
    const { error } = await service
      .from("grade_program_access")
      .upsert({ grade_id, program_id }, { onConflict: "grade_id,program_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "revoke") {
    const { error } = await service
      .from("grade_program_access")
      .delete()
      .eq("grade_id", grade_id)
      .eq("program_id", program_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "action은 grant 또는 revoke" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
