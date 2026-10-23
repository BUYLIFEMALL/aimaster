import { NextRequest, NextResponse } from "next/server";
import { sendSupportEmails } from "@/lib/email/sender";

const ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL || process.env.SMTP_USER || "";
// 로그인 없이 호출되는 공개 API라 형식·길이를 먼저 거른다(잘못된 주소로 SMTP를 계속 두드리지 않게).
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** 고객 문의 전송 API */
export async function POST(req: NextRequest) {
  try {
    const { name, email, type, message } = await req.json();

    if (!name || !email || !type || !message) {
      return NextResponse.json({ error: "모든 필드를 입력해주세요" }, { status: 400 });
    }

    if (
      typeof email !== "string" || !EMAIL_RE.test(email) ||
      String(name).length > 100 || String(type).length > 100 || String(message).length > 5000
    ) {
      return NextResponse.json({ error: "입력값을 확인해주세요" }, { status: 400 });
    }

    if (!ADMIN_EMAIL) {
      console.error("[Support] ADMIN_EMAIL 미설정");
      return NextResponse.json({ error: "이메일 설정 오류" }, { status: 500 });
    }

    const result = await sendSupportEmails(ADMIN_EMAIL, { name, email, type, message });

    return NextResponse.json({
      ok: true,
      sent: result,
    });
  } catch (err) {
    console.error("[Support] 오류:", err);
    return NextResponse.json({ error: "문의 전송 실패" }, { status: 500 });
  }
}
