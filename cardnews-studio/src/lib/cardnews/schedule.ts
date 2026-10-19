// 인스타 예약 게시(v1.19) 시각 검사 — 순수 함수(자동 검사용). 예약은 10분 뒤 ~ 60일 안.
export const MIN_LEAD_MS = 10 * 60 * 1000;
export const MAX_AHEAD_MS = 60 * 24 * 60 * 60 * 1000;
export const MAX_PENDING_PER_USER = 20;

export function validateScheduleTime(raw: unknown, now: number = Date.now()): { ok: true; at: Date } | { ok: false; error: string } {
  const t = typeof raw === "string" ? Date.parse(raw) : NaN;
  if (!Number.isFinite(t)) return { ok: false, error: "예약 시각이 올바르지 않습니다." };
  if (t < now + MIN_LEAD_MS) return { ok: false, error: "예약은 지금부터 10분 뒤 이후로 정해 주세요." };
  if (t > now + MAX_AHEAD_MS) return { ok: false, error: "예약은 60일 안으로만 정할 수 있습니다." };
  return { ok: true, at: new Date(t) };
}

/** 예약 실행 실패 후 다시 시도까지 기다리는 시간(v1.20, 한 번만) */
export const RETRY_DELAY_MS = 10 * 60 * 1000;

/** 다시 시도할 만한 일시 오류인가 — 인스타 서버 지연·미디어 처리 지연·네트워크 끊김·5xx. 연결 만료·권한·형식 오류는 다시 해도 같으므로 제외 */
export function isTransientPublishError(message: string): boolean {
  if (/만료|권한|연결된 인스타그램 계정이 없|permission|expired|invalid|OAuth/i.test(message)) return false;
  return /timeout|timed out|너무 오래|fetch failed|network|ECONNRESET|ETIMEDOUT|socket|\((5\d\d)\)|temporarily|unavailable|try again|잠시 후/i.test(message);
}

/** 한국 시간 「YYYY-MM-DDTHH:mm」(datetime-local 입력값) → ISO. 브라우저 시간대와 상관없이 한국 시간으로 본다. */
export function kstLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 9, mi)).toISOString();
}

/** ISO → 한국 시간 보기용 「M월 D일 HH:mm」 */
export function formatKst(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("month")}월 ${g("day")}일 ${g("hour")}:${g("minute")}`;
}
