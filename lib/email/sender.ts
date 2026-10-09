import { getTransporter, EMAIL_FROM } from "./client";
import { decideSend, classifySendError, resolveGlobalLimit, GUARD_CONFIG, type EmailKind } from "./guard";
import { loadGuardFacts, recordEmail } from "./guardStore";
import {
  welcomeEmail,
  paymentEmail,
  expiryReminderEmail,
  supportInquiryEmail,
  supportConfirmEmail,
  type WelcomeData,
  type PaymentData,
  type ExpiryReminderData,
  type SupportInquiryData,
} from "./templates";

/**
 * 이메일 전송 (실패해도 throw하지 않음 — 이메일 실패가 메인 로직을 중단시키면 안 됨)
 *
 * 안전장치(lib/email/guard.ts): 운영자 Gmail이 한도·인증 오류를 내면 일정 시간 모든 발송을 멈추고,
 * 같은 메일의 중복 발송과 수신자별·하루 전체 상한 초과를 막는다. 재시도는 하지 않는다(재시도가 한도를 더 길게 만든다).
 * 발송 기록 표를 못 읽으면 안전장치 없이 평소처럼 보낸다(기록 문제로 메일이 끊기지 않게).
 */
async function send(kind: EmailKind, to: string, subject: string, html: string) {
  const subjectKey = subject.slice(0, 120);
  try {
    const facts = await loadGuardFacts(to, kind, subjectKey);
    if (facts) {
      const decision = decideSend(kind, facts, GUARD_CONFIG, resolveGlobalLimit(process.env.EMAIL_DAILY_LIMIT));
      if (!decision.allow) {
        console.warn(`[Email] 발송 건너뜀(${decision.reason}): ${to} — ${subject}`);
        await recordEmail(to, kind, subjectKey, "skipped", decision.reason);
        return false;
      }
    }

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
    await recordEmail(to, kind, subjectKey, "sent");
    return true;
  } catch (err) {
    const errorClass = classifySendError(err);
    console.error(`[Email] 전송 실패(${errorClass}):`, err);
    await recordEmail(
      to,
      kind,
      subjectKey,
      errorClass === "other" ? "failed" : errorClass,
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

/** 회원가입 환영 이메일 */
export async function sendWelcomeEmail(to: string, data: WelcomeData) {
  const { subject, html } = welcomeEmail(data);
  return send("welcome", to, subject, html);
}

/** 결제 완료 이메일 */
export async function sendPaymentEmail(to: string, data: PaymentData) {
  const { subject, html } = paymentEmail(data);
  return send("payment", to, subject, html);
}

/** 구독 만료 알림 이메일 */
export async function sendExpiryReminderEmail(to: string, data: ExpiryReminderData) {
  const { subject, html } = expiryReminderEmail(data);
  return send("expiry", to, subject, html);
}

/** 고객 문의 이메일 (관리자에게 + 고객에게 접수 확인) */
export async function sendSupportEmails(adminEmail: string, data: SupportInquiryData) {
  const inquiry = supportInquiryEmail(data);
  const confirm = supportConfirmEmail(data);

  // 네이버 SMTP는 동시 연결 수 제한이 있어(421 Too many concurrent connection),
  // 동시에 두 통을 보내면 하나가 거절될 수 있다. 순차적으로 보낸다.
  const toAdmin = await send("support_admin", adminEmail, inquiry.subject, inquiry.html);
  const toCustomer = await send("support_confirm", data.email, confirm.subject, confirm.html);

  return { toAdmin, toCustomer };
}
