import { NextRequest, NextResponse } from "next/server";
import { getOperatorSmsSender } from "@/lib/sms/solapi";
import { isValidPhone, phoneDigits } from "@/lib/utils/phone";
import {
  CODE_TTL_MS,
  SMS_COOLDOWN_MS,
  SMS_LIMIT,
  findMemberByEmail,
  getResetState,
  hashCode,
  isValidEmail,
  newCode,
  normalizeEmail,
  recent,
  saveResetState,
} from "@/lib/auth/passwordReset";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 이메일·핸드폰이 같은 회원일 때만 보내지만, 가입 정보가 드러나지 않도록 안내는 같게 한다.
const SENT_MESSAGE = "가입 정보와 일치하면 인증번호 문자를 보냈습니다. 5분 안에 입력해주세요.";

/** POST — 비밀번호 재설정 인증번호 문자 발송 { email, phone } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  const phone = phoneDigits(typeof body?.phone === "string" ? body.phone : "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "이메일 주소를 정확히 입력해주세요." }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)" }, { status: 400 });
  }

  const member = await findMemberByEmail(email);
  if (!member || member.is_suspended || phoneDigits(member.phone) !== phone) {
    return NextResponse.json({ ok: true, message: SENT_MESSAGE });
  }

  const state = await getResetState(member.id);
  const now = Date.now();
  const sent = recent(state.sms_sent, SMS_LIMIT.windowMs, now);
  const last = sent[sent.length - 1];
  if (last && now - last < SMS_COOLDOWN_MS) {
    const wait = Math.ceil((SMS_COOLDOWN_MS - (now - last)) / 1000);
    return NextResponse.json({ error: `${wait}초 뒤에 다시 받을 수 있습니다.` }, { status: 429 });
  }
  if (sent.length >= SMS_LIMIT.count) {
    return NextResponse.json({ error: "인증번호를 너무 많이 요청했습니다. 1시간 뒤에 다시 시도해주세요." }, { status: 429 });
  }

  const sendSms = await getOperatorSmsSender();
  if (!sendSms) {
    return NextResponse.json({ error: "문자 인증은 준비 중입니다. 이메일 인증을 이용해주세요." }, { status: 503 });
  }

  const code = newCode();
  try {
    await sendSms(phone, `[AI Master] 비밀번호 재설정 인증번호 [${code}]를 5분 안에 입력해주세요.`);
  } catch (e) {
    console.error("[password-reset/sms] 문자 발송 실패", e);
    return NextResponse.json({ error: "문자를 보내지 못했습니다. 잠시 뒤 다시 시도하거나 이메일 인증을 이용해주세요." }, { status: 502 });
  }

  await saveResetState(member.id, {
    ...state,
    sms_sent: [...sent, now],
    code_hash: hashCode(code, member.id),
    code_exp: now + CODE_TTL_MS,
    attempts: 0,
  });
  return NextResponse.json({ ok: true, message: SENT_MESSAGE });
}
