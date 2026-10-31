import "server-only";

// 회원 본인 Resend 키로 메일 1통. 기준 realty-listing-alert lib/notifySend.ts sendResendMail(공용 키 resend_api_key)
export const RESEND_FROM = "AI 쿠팡 운영 자동화 <onboarding@resend.dev>";

export async function sendResendMail(apiKey: string, mail: { to: string; subject: string; text: string }): Promise<{ ok: true } | { ok: false; error: string; ownerEmail?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [mail.to], subject: mail.subject, text: mail.text }),
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  // 무료 요금제는 가입 메일로만 보낼 수 있다. 응답에서 가입 메일을 읽어 바로 고칠 수 있게 알려 준다
  const owner = /own email address \(([^)\s]+@[^)\s]+)\)/i.exec(body.message ?? "")?.[1];
  if (owner) return { ok: false, ownerEmail: owner, error: `무료 Resend는 가입한 메일(${owner})로만 보낼 수 있습니다. 받는 주소를 그 메일로 바꿔 주세요.` };
  const hint = res.status === 401 || res.status === 403 ? " 키를 확인해 주세요." : res.status === 429 ? " 오늘 보낼 수 있는 양(무료 하루 100통)을 넘었을 수 있습니다." : "";
  return { ok: false, error: `메일을 보내지 못했습니다(${res.status}).${hint}` };
}
