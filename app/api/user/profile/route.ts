import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** PUT — 프로필 수정 (이름, 전화번호) */
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { name, phone } = await req.json();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: name?.trim() || null,
      phone: phone?.trim() || null,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
