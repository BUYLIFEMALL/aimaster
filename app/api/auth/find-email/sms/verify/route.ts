import { NextRequest, NextResponse } from "next/server";
import { phoneDigits } from "@/lib/utils/phone";
import { checkCode, findMembersByNamePhone, maskEmail } from "@/lib/auth/passwordReset";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** POST — 이메일 찾기 인증번호 확인 { name, phone, code } → 성공하면 일부 가린 이메일 목록 { emails } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = phoneDigits(typeof body?.phone === "string" ? body.phone : "");
  const code = typeof body?.code === "string" ? body.code.replace(/[^0-9]/g, "") : "";
  if (code.length !== 6) {
    return NextResponse.json({ error: "인증번호 6자리를 입력해주세요." }, { status: 400 });
  }

  const members = name ? await findMembersByNamePhone(name, phone) : [];
  if (members.length === 0) {
    return NextResponse.json({ error: "인증번호가 만료되었거나 없습니다. 인증번호를 다시 받아주세요." }, { status: 400 });
  }

  const failure = await checkCode(members[0].id, code, "find_email");
  if (failure) return NextResponse.json(failure.body, { status: failure.status });

  return NextResponse.json({ ok: true, emails: members.map((m) => maskEmail(m.email)) });
}
