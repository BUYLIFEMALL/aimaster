import "server-only";
import nodemailer from "nodemailer";

export interface SmtpAccountCredentials {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_name: string | null;
}

/**
 * 등록된 SMTP 계정 1개로 transporter를 만든다. 루트 lib/email/client.ts의 단일 관리자 계정
 * 패턴과 달리, 이 프로그램은 사용자가 여러 계정을 등록하므로 매번 계정별로 새로 만든다
 * (재사용 캐시 없음 — 계정 수가 많지 않고 발송이 순차적이라 문제 없다).
 */
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
 * SMTP 계정 1건으로 이메일 1통을 보낸다. 네이버 SMTP는 동시 연결 수 제한이 있어(루트
 * lib/email/sender.ts 주석 참고, 421 Too many concurrent connection), 호출부에서 반드시
 * 순차적으로(await 하나씩) 호출해야 한다 — 이 함수 자체는 그 규칙을 강제하지 않는다.
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
