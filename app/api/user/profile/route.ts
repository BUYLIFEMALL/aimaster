import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatPhoneNumber } from "@/lib/utils/format";
import { isValidPhone } from "@/lib/utils/phone";

/** PUT — 프로필 수정 (이름, 핸드폰). 이름과 핸드폰은 필수이고 핸드폰 번호만 유효하다. */
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { name, phone } = await req.json();

  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  if (typeof phone !== "string" || !isValidPhone(phone)) {
    return NextResponse.json({ error: "핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: cleanName.slice(0, 50),
      phone: formatPhoneNumber(phone),
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
