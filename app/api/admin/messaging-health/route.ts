import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTransporter } from "@/lib/email/client";
import { getOperatorSmsBalance } from "@/lib/sms/solapi";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type CheckResult = { ok: boolean; message: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증 필요", status: 401 };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: "관리자 권한 필요", status: 403 };
  return { user };
}

/**
 * GET — 메일(SMTP)·문자(솔라피) 연결 점검 (2026-10-19). 실제로 메일·문자를 보내지 않는다.
 * 메일은 SMTP 로그인만 시험(transporter.verify), 문자는 운영자 솔라피 계정 잔액 조회(무료).
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [email, sms] = await Promise.all([checkEmail(), checkSms()]);
  return NextResponse.json({ checkedAt: new Date().toISOString(), email, sms });
}

async function checkEmail(): Promise<CheckResult> {
  const transporter = getTransporter();
  const host = process.env.SMTP_HOST ?? "";
  if (!transporter) return { ok: false, message: "SMTP 환경변수(SMTP_HOST·SMTP_USER·SMTP_PASSWORD)가 없습니다." };
  try {
    await transporter.verify();
    return { ok: true, message: `정상 — ${host} 로그인 성공` };
  } catch (e) {
    const err = e as { responseCode?: number; code?: string; message?: string };
    const reason =
      err.responseCode === 535 || err.code === "EAUTH"
        ? "로그인 거절(아이디·비밀번호 또는 앱 비밀번호 확인, 메일 서비스의 SMTP 사용 설정 확인)"
        : err.message ?? "알 수 없는 오류";
    return { ok: false, message: `실패 — ${host}: ${reason}` };
  }
}

async function checkSms(): Promise<CheckResult> {
  try {
    const result = await getOperatorSmsBalance();
    if (!result) return { ok: false, message: "관리자 계정에 솔라피 계정(API 키·발신번호)이 등록되어 있지 않습니다." };
    const total = result.balance + result.point;
    return {
      ok: total > 0,
      message: `${total > 0 ? "정상" : "잔액 없음"} — 솔라피 잔액 ${Math.floor(result.balance).toLocaleString("ko-KR")}원${
        result.point ? ` + 포인트 ${Math.floor(result.point).toLocaleString("ko-KR")}` : ""
      }`,
    };
  } catch (e) {
    return { ok: false, message: `실패 — 솔라피 조회 오류: ${(e as Error).message}` };
  }
}
