import "server-only";
import { sendViaSmtpAccount } from "@/lib/email/transport";
import { buildReportNotificationEmail } from "@/lib/email/reportEmail";

type AdminLike = {
  auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { email?: string | null } | null } }> } };
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * 예약(정기 자동 생성)으로 만들어진 리포트만 이메일로 알린다 — "지금 생성" 수동 클릭은 이미
 * 화면을 보고 있어 중복 알림이라 제외한다(trending-product-finder Phase 10과 동일한 판단).
 * 텔레그램(lib/telegramReview.ts)은 승인/거부 버튼이 곧 "발행 여부 결정" 액션이라 수동
 * 생성에도 필요해서 계속 매번 보내지만, 이메일은 순수 알림이라 이 프로젝트에서는 예약
 * 생성분에만 보낸다. SMTP 계정이 없으면 조용히 건너뛴다(에러 아님).
 */
export async function notifyReportByEmail(
  admin: AdminLike,
  userId: string,
  report: { id: string; title: string; summary: string },
): Promise<void> {
  const [{ data: userData }, { data: smtpAccount }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("user_smtp_accounts")
      .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name")
      .eq("user_id", userId)
      .eq("is_active", true)
      // 다른 프로그램에서 이미 여러 개(예: Gmail+네이버) 등록해둔 경우 가장 최근 것을 쓴다
      // (설정 페이지 SmtpAccountSection의 정렬과 동일한 기준).
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const email = userData?.user?.email;
  if (!email || !smtpAccount) return;

  try {
    const { subject, html } = buildReportNotificationEmail(report);
    await sendViaSmtpAccount(smtpAccount, email, subject, html);
  } catch (err) {
    console.error("리포트 이메일 알림 발송 실패:", err);
  }
}
