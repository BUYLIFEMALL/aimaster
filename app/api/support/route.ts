import { NextRequest, NextResponse } from "next/server";
import { sendSupportEmails } from "@/lib/email/sender";

const ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL || process.env.SMTP_USER || "";

/** 고객 문의 전송 API */
export async function POST(req: NextRequest) {
  try {
    const { name, email, type, message } = await req.json();

    if (!name || !email || !type || !message) {
      return NextResponse.json({ error: "모든 필드를 입력해주세요" }, { status: 400 });
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
