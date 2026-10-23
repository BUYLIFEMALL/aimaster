import { NextRequest, NextResponse } from "next/server";
import { isValidPhone, phoneDigits } from "@/lib/utils/phone";
import { findMemberByEmail, isValidEmail, normalizeEmail, sendCodeSms } from "@/lib/auth/passwordReset";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 이메일·핸드폰이 같은 회원일 때만 보내지만, 가입 정보가 드러나지 않도록 안내는 같게 한다.
const SENT_MESSAGE = "가입 정보와 일치하면 인증번호 문자를 보냈습니다. 5분 안에 입력해주세요.";

/** POST — 비밀번호 재설정 인증번호 문자 발송 { email, phone } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  const phone = phoneDigits(typeof body?.phone === "string" ? body.phone : "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "이메일 주소를 정확히 입력해주세요." }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)" }, { status: 400 });
  }

  const member = await findMemberByEmail(email);
  if (!member || member.is_suspended || phoneDigits(member.phone) !== phone) {
    return NextResponse.json({ ok: true, message: SENT_MESSAGE });
  }

  const failure = await sendCodeSms(
    member.id,
    phone,
    "reset",
    (code) => `[AI Master] 비밀번호 재설정 인증번호 [${code}]를 5분 안에 입력해주세요.`
  );
  if (failure) return NextResponse.json(failure.body, { status: failure.status });
  return NextResponse.json({ ok: true, message: SENT_MESSAGE });
}
