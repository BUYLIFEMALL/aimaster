import { NextRequest, NextResponse } from "next/server";
import { isValidPhone, phoneDigits } from "@/lib/utils/phone";
import { findMembersByNamePhone, sendCodeSms } from "@/lib/auth/passwordReset";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 가입 여부가 드러나지 않도록 일치하지 않아도 같은 안내를 돌려준다.
const SENT_MESSAGE = "가입 정보와 일치하면 인증번호 문자를 보냈습니다. 5분 안에 입력해주세요.";

/**
 * POST — 이메일(아이디) 찾기 인증번호 문자 발송 { name, phone }.
 * 같은 이름·번호로 계정이 여럿이면 가장 먼저 가입한 계정에 인증 상태를 저장하고, 확인 후 모두 보여준다.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = phoneDigits(typeof body?.phone === "string" ? body.phone : "");
  if (!name) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)" }, { status: 400 });
  }

  const [anchor] = await findMembersByNamePhone(name, phone);
  if (!anchor) return NextResponse.json({ ok: true, message: SENT_MESSAGE });

  const failure = await sendCodeSms(
    anchor.id,
    phone,
    "find_email",
    (code) => `[AI Master] 이메일(아이디) 찾기 인증번호 [${code}]를 5분 안에 입력해주세요.`
  );
  if (failure) return NextResponse.json(failure.body, { status: failure.status });
  return NextResponse.json({ ok: true, message: SENT_MESSAGE });
}
