// 비밀번호 찾기(본인 인증 후 재설정) 공용 서버 함수 — 2026-10-19 주인님 지시.
// 상세 설계: docs/PLAN_20261019_PASSWORD_RESET.md
// - 이메일 인증: 서버 키로 recovery 토큰을 만들고 운영자 SMTP로 링크를 보낸다(Supabase 기본 메일 미사용).
// - 문자 인증: 6자리 인증번호를 문자로 보내고, 맞으면 같은 recovery 토큰을 발급한다.
// - 요청 횟수·인증번호 해시·만료·시도 횟수는 서버 키로만 쓸 수 있는 auth app_metadata.password_reset 에 잠시 저장한다
//   (새 테이블 없이 회원별 상태 보관). 인증이 끝나면 지운다.
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getSupabaseSecretKey } from "@/lib/supabase/serverEnv";

export const EMAIL_LIMIT = { count: 3, windowMs: 10 * 60 * 1000 }; // 이메일: 10분에 3번
export const SMS_LIMIT = { count: 5, windowMs: 60 * 60 * 1000 }; // 문자: 1시간에 5번
export const SMS_COOLDOWN_MS = 60 * 1000; // 문자 다시 받기: 60초 뒤
export const CODE_TTL_MS = 5 * 60 * 1000; // 인증번호 유효 5분
export const CODE_MAX_ATTEMPTS = 5; // 5번 틀리면 무효

export type ResetState = {
  email_sent?: number[];
  sms_sent?: number[];
  code_hash?: string | null;
  code_exp?: number | null;
  attempts?: number;
};

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

/** 메일 링크 주소 — 요청 Host 헤더가 아니라 고정 주소를 쓴다(주소 바꿔치기 방지) */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.buylife.xyz").replace(/\/$/, "");
}
