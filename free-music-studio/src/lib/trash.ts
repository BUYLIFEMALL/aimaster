// 휴지통(2026-11-06) — 원본 boks-music `electron/trash.mjs`(MIT, © 2026 boksajang) 규칙을 우리 DB에 맞춤:
// 넣으면 trashed_at(넣은 시각)·trash_batch_id(같이 넣은 묶음)를 적고, 되살리면 비운다. 30일 지나면 /api/cron/cleanup이 비운다
// (관리자·시험 계정 profiles.retention_exempt 제외). 원래 프로젝트가 지워졌으면 되살릴 프로젝트를 고를 수 있다.
// 순수 함수 — 시험 tests/trash.test.mjs.

export const TRASH_DAYS = 30;
export const TRASH_IDS_MAX = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 곡 번호 목록 검사 — uuid만, 중복 없이, 500개까지 */
export function parseIdList(value: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || !value.length) return { ok: false, error: "곡을 골라 주세요." };
  if (value.length > TRASH_IDS_MAX) return { ok: false, error: `한 번에 ${TRASH_IDS_MAX}곡까지 할 수 있습니다.` };
  if (value.some((v) => typeof v !== "string" || !UUID.test(v))) return { ok: false, error: "곡 번호가 올바르지 않습니다." };
  return { ok: true, value: [...new Set(value as string[])] };
}

/** 휴지통에 넣은 지 며칠 남았는지(화면 표시) — 지난 경우 0 */
export function daysLeft(trashedAt: string, now = Date.now()): number {
  const left = Date.parse(trashedAt) + TRASH_DAYS * 864e5 - now;
  return Math.max(0, Math.ceil(left / 864e5));
}
