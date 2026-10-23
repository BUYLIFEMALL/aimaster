// 비밀번호 찾기(본인 인증 후 재설정) 공용 서버 함수 — 2026-10-19 주인님 지시.
// 상세 설계: docs/PLAN_20261019_PASSWORD_RESET.md
// - 이메일 인증: 서버 키로 recovery 토큰을 만들고 운영자 SMTP로 링크를 보낸다(Supabase 기본 메일 미사용).
// - 문자 인증: 6자리 인증번호를 문자로 보내고, 맞으면 같은 recovery 토큰을 발급한다.
// - 요청 횟수·인증번호 해시·만료·시도 횟수는 서버 키로만 쓸 수 있는 auth app_metadata.password_reset 에 잠시 저장한다
//   (새 테이블 없이 회원별 상태 보관). 인증이 끝나면 지운다.
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getSupabaseSecretKey } from "@/lib/supabase/serverEnv";
import { getOperatorSmsSender } from "@/lib/sms/solapi";
import { formatPhoneNumber } from "@/lib/utils/format";
import { phoneDigits } from "@/lib/utils/phone";

export const EMAIL_LIMIT = { count: 3, windowMs: 10 * 60 * 1000 }; // 이메일: 10분에 3번
export const SMS_LIMIT = { count: 5, windowMs: 60 * 60 * 1000 }; // 문자: 1시간에 5번
export const SMS_COOLDOWN_MS = 60 * 1000; // 문자 다시 받기: 60초 뒤
export const CODE_TTL_MS = 5 * 60 * 1000; // 인증번호 유효 5분
export const CODE_MAX_ATTEMPTS = 5; // 5번 틀리면 무효

/** reset = 비밀번호 찾기, find_email = 이메일(아이디) 찾기 — 한 용도로 받은 인증번호를 다른 용도에 쓰지 못하게 구분 */
export type CodePurpose = "reset" | "find_email";

export type ResetState = {
  email_sent?: number[];
  sms_sent?: number[];
  code_hash?: string | null;
  code_exp?: number | null;
  code_purpose?: CodePurpose | null;
  attempts?: number;
  // 다시 받기 직전의 인증번호 — 새 문자가 늦거나 통신사에서 막혀도 먼저 받은 번호로 인증할 수 있게 유효 시간 안에서 함께 인정
  prev_code_hash?: string | null;
  prev_code_exp?: number | null;
};

/** 실패 응답(상태 코드 + 본문). 성공이면 null */
export type CodeFailure = { status: number; body: { error: string } } | null;

export type Member = { id: string; email: string; phone: string | null; is_suspended: boolean | null };

export function adminClient() {
  return createServiceClient();
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function findMemberByEmail(email: string): Promise<Member | null> {
  const { data } = await adminClient()
    .from("profiles")
    .select("id, email, phone, is_suspended")
    .eq("email", email)
    .maybeSingle();
  return (data as Member | null) ?? null;
}

export async function getResetState(userId: string): Promise<ResetState> {
  const { data } = await adminClient().auth.admin.getUserById(userId);
  return (data?.user?.app_metadata?.password_reset as ResetState | undefined) ?? {};
}

export async function saveResetState(userId: string, state: ResetState | null) {
  const admin = adminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const appMeta = { ...(data?.user?.app_metadata ?? {}), password_reset: state };
  await admin.auth.admin.updateUserById(userId, { app_metadata: appMeta });
}

/** 최근 windowMs 안의 기록만 남긴다 */
export function recent(times: number[] | undefined, windowMs: number, now = Date.now()): number[] {
  return (times ?? []).filter((t) => now - t < windowMs);
}

/** recovery 1회용 토큰 해시 — /reset-password?token_hash=… 에서 verifyOtp 로 사용 */
export async function createRecoveryTokenHash(email: string): Promise<string | null> {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: "recovery", email });
  if (error) return null;
  return data?.properties?.hashed_token ?? null;
}

export function hashCode(code: string, userId: string): string {
  return crypto.createHmac("sha256", getSupabaseSecretKey()).update(`${userId}:${code}`).digest("hex");
}

export function codesMatch(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function newCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

const fail = (status: number, error: string): CodeFailure => ({ status, body: { error } });

/** 인증번호 문자 발송 + 상태 저장. 발송 간격·횟수 제한 포함. 성공하면 null */
export async function sendCodeSms(
  userId: string,
  phone: string,
  purpose: CodePurpose,
  text: (code: string) => string
): Promise<CodeFailure> {
  const state = await getResetState(userId);
  const now = Date.now();
  const sent = recent(state.sms_sent, SMS_LIMIT.windowMs, now);
  const last = sent[sent.length - 1];
  if (last && now - last < SMS_COOLDOWN_MS) {
    return fail(429, `${Math.ceil((SMS_COOLDOWN_MS - (now - last)) / 1000)}초 뒤에 다시 받을 수 있습니다.`);
  }
  if (sent.length >= SMS_LIMIT.count) {
    return fail(429, "인증번호를 너무 많이 요청했습니다. 1시간 뒤에 다시 시도해주세요.");
  }

  const sendSms = await getOperatorSmsSender();
  if (!sendSms) return fail(503, "문자 인증은 준비 중입니다. 잠시 뒤 다시 시도해주세요.");

  const code = newCode();
  try {
    await sendSms(phone, text(code));
  } catch (e) {
    console.error(`[sms-code/${purpose}] 문자 발송 실패`, e);
    return fail(502, "문자를 보내지 못했습니다. 잠시 뒤 다시 시도해주세요.");
  }

  await saveResetState(userId, {
    ...state,
    sms_sent: [...sent, now],
    prev_code_hash: state.code_purpose === purpose ? state.code_hash ?? null : null,
    prev_code_exp: state.code_purpose === purpose ? state.code_exp ?? null : null,
    code_hash: hashCode(code, userId),
    code_exp: now + CODE_TTL_MS,
    code_purpose: purpose,
    attempts: 0,
  });
  return null;
}

const CODE_EXPIRED = "인증번호가 만료되었거나 없습니다. 인증번호를 다시 받아주세요.";

/** 인증번호 확인. 맞으면 인증번호를 지우고 null, 틀리면 시도 횟수를 올린다 */
export async function checkCode(userId: string, code: string, purpose: CodePurpose): Promise<CodeFailure> {
  const state = await getResetState(userId);
  if (!state.code_hash || !state.code_exp || Date.now() > state.code_exp || state.code_purpose !== purpose) {
    return fail(400, CODE_EXPIRED);
  }
  const cleared = {
    ...state,
    code_hash: null,
    code_exp: null,
    code_purpose: null,
    attempts: 0,
    prev_code_hash: null,
    prev_code_exp: null,
  };
  const hashed = hashCode(code, userId);
  const prevValid = !!state.prev_code_hash && !!state.prev_code_exp && Date.now() <= state.prev_code_exp;
  if (!codesMatch(hashed, state.code_hash) && !(prevValid && codesMatch(hashed, state.prev_code_hash!))) {
    const attempts = (state.attempts ?? 0) + 1;
    if (attempts >= CODE_MAX_ATTEMPTS) {
      await saveResetState(userId, cleared);
      return fail(400, `인증번호를 ${CODE_MAX_ATTEMPTS}번 틀렸습니다. 인증번호를 다시 받아주세요.`);
    }
    await saveResetState(userId, { ...state, attempts });
    return fail(400, `인증번호가 올바르지 않습니다. (남은 횟수 ${CODE_MAX_ATTEMPTS - attempts}번)`);
  }
  await saveResetState(userId, cleared);
  return null;
}

/** 이름 + 핸드폰이 같은 회원들(가입 순). 같은 번호로 여러 계정이 있을 수 있다 */
export async function findMembersByNamePhone(name: string, phone: string): Promise<Member[]> {
  const { data } = await adminClient()
    .from("profiles")
    .select("id, email, phone, is_suspended")
    .eq("name", name)
    .eq("phone", formatPhoneNumber(phone))
    .order("created_at", { ascending: true });
  return ((data as Member[] | null) ?? []).filter((m) => !m.is_suspended && phoneDigits(m.phone) === phone);
}

/** buylifemall@gmail.com → bu*********@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const keep = local.length <= 2 ? 1 : 2;
  return `${local.slice(0, keep)}${"*".repeat(Math.max(local.length - keep, 3))}@${domain}`;
}

/** 메일 링크 주소 — 요청 Host 헤더가 아니라 고정 주소를 쓴다(주소 바꿔치기 방지) */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.buylife.xyz").replace(/\/$/, "");
}
