import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** PUT — 비밀번호 변경 */
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { newPassword } = await req.json();

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "비밀번호는 6자 이상이어야 합니다" },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
