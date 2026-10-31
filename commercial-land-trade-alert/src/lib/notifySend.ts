// 카카오 「나에게 보내기」·Resend 메일 보내기(웹 시험 보내기용). 확장 extension/lib/notify.js와 같은 요청 모양.
// 형식 기준: kakao_auto_poster lib/kakao/client.ts sendReportMemoToMe(텍스트 템플릿 + 웹 링크).

export const RESEND_FROM = "상가·건물·토지 매물 알림 <onboarding@resend.dev>";

export async function sendKakaoMemo(accessToken: string, msg: { text: string; url: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const template = {
    object_type: "text",
    text: msg.text.slice(0, 200),
    link: { web_url: msg.url, mobile_web_url: msg.url },
    button_title: "결과 보기",
  };
  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }).toString(),
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { msg?: string };
  return { ok: false, error: `카카오 보내기에 실패했어요(${res.status}${body.msg ? `: ${body.msg}` : ""}).` };
}

export async function sendResendMail(
  apiKey: string,
  mail: { to: string; subject: string; text: string; attachments?: { filename: string; content: string }[] },
): Promise<{ ok: true } | { ok: false; error: string; ownerEmail?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [mail.to], subject: mail.subject, text: mail.text, attachments: mail.attachments }),
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  // 무료 요금제: 「You can only send testing emails to your own email address (x@y)」 — 가입 메일을 읽어 바로 고칠 수 있게
  const owner = /own email address \(([^)\s]+@[^)\s]+)\)/i.exec(body.message ?? "")?.[1];
  if (owner) return { ok: false, ownerEmail: owner, error: `무료 Resend는 가입한 메일 주소(${owner})로만 보낼 수 있어요. 받는 주소를 ${owner}로 바꿔 주세요.` };
  const hint =
    res.status === 401 || res.status === 403
      ? " 키가 틀렸거나, 무료 요금제라 Resend에 가입한 본인 메일 주소로만 보낼 수 있어요(받는 주소를 가입 메일로 바꿔 주세요)."
      : res.status === 429
        ? " 오늘 보낼 수 있는 양(무료 하루 100통)을 넘었을 수 있어요."
        : "";
  return { ok: false, error: `메일 보내기에 실패했어요(${res.status}${body.message ? `: ${body.message}` : ""}).${hint}` };
}
