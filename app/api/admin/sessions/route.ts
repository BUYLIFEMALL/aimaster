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

/** DELETE — 세션 강제 종료 (session_id 또는 user_id) */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { session_id, user_id } = await req.json();
  const service = createServiceClient();

  if (session_id) {
    const { error } = await service.from("user_sessions").delete().eq("id", session_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (user_id) {
    const { error } = await service.from("user_sessions").delete().eq("user_id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "session_id 또는 user_id 필요" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
