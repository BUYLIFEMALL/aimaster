import nodemailer from "nodemailer";

/** SMTP transporter (재사용) */
let transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    console.warn("[Email] SMTP 설정이 없습니다. 이메일이 전송되지 않습니다.");
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

export const EMAIL_FROM =
  process.env.EMAIL_FROM || `AI Master <${process.env.SMTP_USER || "noreply@buylife.xyz"}>`;
