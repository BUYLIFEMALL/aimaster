// 자동 배송 완료·구매 확정(D12) — 운영자 입력 검사와 안내 문구. 실제 이동은 DB 함수 mall_builder_auto_progress(0032)
export const AUTO_DAYS_MIN = 1;
export const AUTO_DAYS_MAX = 60;

/** 일수 입력: 비우면 끔(null), 1~60 정수만 */
export function parseAutoDays(input: string, what: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const text = input.trim();
  if (text === "") return { ok: true, value: null };
  if (!/^\d+$/.test(text)) return { ok: false, error: `${what}은 숫자(일)만 입력해 주세요.` };
  const n = Number(text);
  if (n < AUTO_DAYS_MIN || n > AUTO_DAYS_MAX) return { ok: false, error: `${what}은 ${AUTO_DAYS_MIN}~${AUTO_DAYS_MAX}일로 입력해 주세요(비우면 끔).` };
  return { ok: true, value: n };
}

/** 그 상태가 된 시각 + 일수 = 자동으로 넘어갈 예정 시각(실제로는 그 뒤 첫 확인 때) */
export function autoDueAt(since: string | null, days: number | null): Date | null {
  if (!since || days === null) return null;
  const t = new Date(since).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + days * 86_400_000);
}
