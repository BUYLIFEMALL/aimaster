import { getTransporter, EMAIL_FROM } from "./client";
import {
  welcomeEmail,
  paymentEmail,
  expiryReminderEmail,
  type WelcomeData,
  type PaymentData,
  type ExpiryReminderData,
} from "./templates";

/** 이메일 전송 (실패해도 throw하지 않음 — 이메일 실패가 메인 로직을 중단시키면 안 됨) */
async function send(to: string, subject: string, html: string) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[Email] transporter 없음 — SMTP 설정을 확인하세요");
      return false;
    }

    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`[Email] 전송 성공: ${to} — ${subject}`);
    return true;
  } catch (err) {
    console.error("[Email] 전송 실패:", err);
    return false;
  }
}

/** 회원가입 환영 이메일 */
export async function sendWelcomeEmail(to: string, data: WelcomeData) {
  const { subject, html } = welcomeEmail(data);
  return send(to, subject, html);
}

/** 결제 완료 이메일 */
export async function sendPaymentEmail(to: string, data: PaymentData) {
  const { subject, html } = paymentEmail(data);
  return send(to, subject, html);
}

/** 구독 만료 알림 이메일 */
export async function sendExpiryReminderEmail(to: string, data: ExpiryReminderData) {
  const { subject, html } = expiryReminderEmail(data);
  return send(to, subject, html);
}
