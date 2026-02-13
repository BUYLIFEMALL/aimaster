import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST — 회원 등급 일괄 변경 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin)
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { user_ids, grade_id } = await req.json();
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json(
      { error: "변경할 회원을 선택해주세요" },
      { status: 400 }
    );
  }

  // grade_id가 null이면 등급 해제
  const { error } = await supabase
    .from("profiles")
    .update({ grade_id: grade_id || null })
    .in("id", user_ids);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, updated: user_ids.length });
}
