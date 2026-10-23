import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/sender";

/** 회원가입 환영 이메일 발송 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name, affiliate_code")
      .eq("id", user.id)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ error: "프로필 없음" }, { status: 404 });
    }

    await sendWelcomeEmail(profile.email, {
      name: profile.name || "회원",
      affiliateCode: profile.affiliate_code || "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Welcome Email]", err);
    return NextResponse.json({ error: "이메일 발송 실패" }, { status: 500 });
  }
}
