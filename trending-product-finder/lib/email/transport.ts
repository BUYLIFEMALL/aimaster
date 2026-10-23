import "server-only";
import nodemailer from "nodemailer";

// booking-reminder/lib/email/transport.ts와 동일한 패턴 — 리포트 이메일 알림(Phase 10)은
// 운영자 공용 SMTP가 아니라 회원 각자가 설정 페이지에서 등록한 SMTP 계정을 쓴다(BYOK,
// 2026-09-02 사용자 지시). 공용 `user_smtp_accounts` 테이블(stepmail/crm-google-form/
// booking-reminder가 이미 만들어둔 것)을 그대로 재사용해서, 다른 프로그램에서 이미 등록한
// 계정이 있으면 여기서도 바로 재사용된다.

export interface SmtpAccountCredentials {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_name: string | null;
}

export function createSmtpTransport(account: SmtpAccountCredentials) {
  return nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: { user: account.smtp_user, pass: account.smtp_password },
  });
}

export function buildFromHeader(account: SmtpAccountCredentials): string {
  return account.from_name ? `${account.from_name} <${account.smtp_user}>` : account.smtp_user;
}

/**
 * SMTP 계정 1건으로 이메일 1통을 보낸다. 네이버 SMTP는 동시 연결 수 제한이 있어(421 Too many
 * concurrent connection) 여러 통을 보낼 때는 반드시 순차적으로(await 하나씩) 호출할 것 —
 * 이 함수 자체는 그 규칙을 강제하지 않는다.
 */
export async function sendViaSmtpAccount(
  account: SmtpAccountCredentials,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const transporter = createSmtpTransport(account);
  await transporter.sendMail({
    from: buildFromHeader(account),
    to,
    subject,
    html,
  });
}
