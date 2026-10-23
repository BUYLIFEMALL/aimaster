import { NextRequest, NextResponse } from "next/server";
import { getTransporter, EMAIL_FROM } from "@/lib/email/client";
import {
  EMAIL_LIMIT,
  createRecoveryTokenHash,
  findMemberByEmail,
  getResetState,
  isValidEmail,
  normalizeEmail,
  recent,
  saveResetState,
  siteUrl,
} from "@/lib/auth/passwordReset";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 가입 여부가 드러나지 않도록, 형식이 맞는 이메일이면 결과와 상관없이 같은 안내를 돌려준다.
const SENT_MESSAGE = "가입된 이메일이면 비밀번호 재설정 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해주세요.";

/** POST — 비밀번호 재설정 메일 발송 { email } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "이메일 주소를 정확히 입력해주세요." }, { status: 400 });
  }

  const transporter = getTransporter();
  if (!transporter) {
    return NextResponse.json({ error: "메일 발송 설정이 준비되지 않았습니다. 고객센터로 문의해주세요." }, { status: 503 });
  }

  const member = await findMemberByEmail(email);
  if (!member || member.is_suspended) {
    return NextResponse.json({ ok: true, message: SENT_MESSAGE });
  }

  const state = await getResetState(member.id);
  const sent = recent(state.email_sent, EMAIL_LIMIT.windowMs);
  if (sent.length >= EMAIL_LIMIT.count) {
    // 이미 여러 번 보냈으면 더 보내지 않는다(같은 안내 유지)
    return NextResponse.json({ ok: true, message: SENT_MESSAGE });
  }

  const tokenHash = await createRecoveryTokenHash(member.email);
  if (!tokenHash) {
    return NextResponse.json({ error: "재설정 링크를 만들지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }

  const link = `${siteUrl()}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: member.email,
      subject: "[AI Master] 비밀번호 재설정 안내",
      html: resetMailHtml(link),
      text: `AI Master 비밀번호 재설정 링크입니다(1시간 동안 1번만 사용할 수 있습니다).\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시해주세요.`,
    });
  } catch (e) {
    console.error("[password-reset/email] 메일 발송 실패", e);
    return NextResponse.json({ error: "메일을 보내지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 502 });
  }

  await saveResetState(member.id, { ...state, email_sent: [...sent, Date.now()] });
  return NextResponse.json({ ok: true, message: SENT_MESSAGE });
}

function resetMailHtml(link: string): string {
  return `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0a0a0f;color:#e5e5e5;border-radius:16px">
  <h2 style="margin:0 0 16px;color:#f5c842">AI Master 비밀번호 재설정</h2>
  <p style="line-height:1.7;margin:0 0 24px">아래 버튼을 눌러 새 비밀번호를 설정해주세요.<br>이 링크는 <b>1시간 동안 1번만</b> 사용할 수 있습니다.</p>
  <p style="text-align:center;margin:0 0 24px"><a href="${link}" style="display:inline-block;padding:14px 28px;background:linear-gradient(90deg,#d4af37,#f5c842);color:#000;font-weight:700;text-decoration:none;border-radius:10px">새 비밀번호 설정하기</a></p>
  <p style="font-size:12px;line-height:1.6;color:#9a9a9a;margin:0">버튼이 눌리지 않으면 아래 주소를 복사해 브라우저에 붙여넣어 주세요.<br><span style="word-break:break-all">${link}</span></p>
  <p style="font-size:12px;color:#9a9a9a;margin:16px 0 0">본인이 요청하지 않았다면 이 메일을 무시해주세요. 비밀번호는 바뀌지 않습니다.</p>
</div>`;
}
