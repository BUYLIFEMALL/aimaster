import "server-only";
import nodemailer from "nodemailer";

// 루트 AIMaster의 lib/email/client.ts와 동일한 패턴 — 운영자 SMTP 계정(가입환영/구독만료
// 메일과 같은 계정)을 재사용하는 플랫폼 알림용 발신기다. 회원별 API 키가 필요한 "엔진"
// 자동화가 아니라 운영자가 전 회원에게 보내는 알림이라 BYOK 원칙과 무관하다(Phase 10,
// 2026-09-02). 각 서브프로젝트가 독립 배포이므로 SMTP_HOST/PORT/USER/PASSWORD/EMAIL_FROM을
// 이 프로젝트의 Vercel 환경변수에도 (루트와 동일한 값으로) 등록해야 실제 발송된다.

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    console.warn("[Email] SMTP 설정이 없습니다(SMTP_HOST/SMTP_USER/SMTP_PASSWORD). 이메일이 전송되지 않습니다.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

const EMAIL_FROM =
  process.env.EMAIL_FROM || `AI Master 상품소싱 자동화 <${process.env.SMTP_USER || "noreply@buylife.xyz"}>`;

/** 이메일 전송 (실패해도 throw하지 않음 — 리포트 생성 자체를 실패시키면 안 된다) */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const t = getTransporter();
    if (!t) return false;
    await t.sendMail({ from: EMAIL_FROM, to, subject, html });
    console.log(`[Email] 전송 성공: ${to} — ${subject}`);
    return true;
  } catch (err) {
    console.error("[Email] 전송 실패:", err);
    return false;
  }
}
