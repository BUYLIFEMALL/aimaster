import { NextRequest, NextResponse } from "next/server";
import { phoneDigits } from "@/lib/utils/phone";
import { checkCode, createRecoveryTokenHash, findMemberByEmail, normalizeEmail } from "@/lib/auth/passwordReset";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** POST — 문자 인증번호 확인 { email, phone, code } → 성공하면 재설정 토큰 { tokenHash } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  const phone = phoneDigits(typeof body?.phone === "string" ? body.phone : "");
  const code = typeof body?.code === "string" ? body.code.replace(/[^0-9]/g, "") : "";
  if (code.length !== 6) {
    return NextResponse.json({ error: "인증번호 6자리를 입력해주세요." }, { status: 400 });
  }

  const member = email ? await findMemberByEmail(email) : null;
  if (!member || member.is_suspended || phoneDigits(member.phone) !== phone) {
    return NextResponse.json({ error: "인증번호가 만료되었거나 없습니다. 인증번호를 다시 받아주세요." }, { status: 400 });
  }

  const failure = await checkCode(member.id, code, "reset");
  if (failure) return NextResponse.json(failure.body, { status: failure.status });

  const tokenHash = await createRecoveryTokenHash(member.email);
  if (!tokenHash) {
    return NextResponse.json({ error: "재설정 준비에 실패했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tokenHash });
}
