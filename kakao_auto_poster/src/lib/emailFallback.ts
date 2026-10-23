import "server-only";
import { sendViaSmtpAccount } from "@/lib/email/transport";

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * 카카오톡 발송(브랜드메시지/알림톡)이 실패한 수신자에게만 쓰는 대체 발송 안전망 —
 * 항상 이중 발송하지 않고 실패했을 때만 보완한다(사용자 지시, 2026-09-10). 발송 계정은
 * 회원 본인이 등록한 SMTP(user_smtp_accounts)를 그대로 재사용한다(BYOK, 관리자 공용 계정
 * 폴백 없음 — lib/emailNotify.ts와 동일한 원칙). SMTP 계정이 없으면 조용히 실패로
 * 반환한다(에러가 아니라 "대체 발송도 불가능했다"는 정상적인 상태).
 */
export async function sendEmailFallback(
  supabase: SupabaseLike,
  userId: string,
  toEmail: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: smtpAccount } = await supabase
    .from("user_smtp_accounts")
    .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!smtpAccount) return { ok: false, error: "SMTP 계정 미등록" };

  try {
    await sendViaSmtpAccount(smtpAccount, toEmail, subject, html);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "이메일 발송 실패" };
  }
}
