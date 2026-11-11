// 입금 기한 자동 취소 — 화면·서버가 함께 쓰는 순수 계산(DB 함수 0024와 같은 기준)
// 플랜: docs/PLAN_20261104_DEPOSIT_AUTO_CANCEL.md · 예약 지침: 루트 docs/SCHEDULER_POLICY.md
import { createHash, randomBytes } from "node:crypto";

export const DEPOSIT_HOURS_MIN = 1;
export const DEPOSIT_HOURS_MAX = 168;
/** 몰 운영자 cron-job.org가 부르는 실행 주소 */
export const DEPOSIT_EXPIRE_PATH = "/api/cron/deposit-expire";
/** 10분마다 확인(입금 기한은 시간 단위라 1분 확인이 필요 없다) */
export const CHECK_MINUTES = [0, 10, 20, 30, 40, 50];
export const RUN_TOKEN_PREFIX = "mbd_";

/** 입력 칸 값 → 시간(비우면 null = 자동 취소 끔) */
export function parseDepositHours(input: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const text = input.trim();
  if (text === "") return { ok: true, value: null };
  if (!/^\d+$/.test(text)) return { ok: false, error: "숫자(시간)만 입력해 주세요." };
  const n = Number(text);
  if (n < DEPOSIT_HOURS_MIN || n > DEPOSIT_HOURS_MAX) return { ok: false, error: `${DEPOSIT_HOURS_MIN}~${DEPOSIT_HOURS_MAX}시간으로 입력해 주세요.` };
  return { ok: true, value: n };
}

/** 몰 전용 실행 토큰 — 운영자 cron-job.org 작업 머리글에만 들어가고, DB에는 해시만 둔다 */
export function newRunToken(): string {
  return RUN_TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

export function hashRunToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** `Authorization: Bearer …` 머리글에서 토큰만(형식이 다르면 null) */
export function bearerToken(header: string | null): string | null {
  const m = /^Bearer\s+(\S+)$/.exec(header?.trim() ?? "");
  if (!m || !m[1].startsWith(RUN_TOKEN_PREFIX) || m[1].length > 100) return null;
  return m[1];
}

/** 몰 하나당 실행 주소 하나 — cron-job.org에서 같은 주소 작업을 찾아 다시 쓴다(중복 생성 방지) */
export function expireUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, "")}${DEPOSIT_EXPIRE_PATH}?store=${encodeURIComponent(slug)}`;
}

export function hoursLabel(hours: number): string {
  return hours % 24 === 0 ? `${hours / 24}일(${hours}시간)` : `${hours}시간`;
}
