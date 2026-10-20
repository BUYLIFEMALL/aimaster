// v1.18 인스타 예약 게시 — 기준: ai-webtoon-studio v1.16 사본(원본 인플루언서 v1.15)(원본 cardnews-studio src/lib/cardnews/schedule.ts v1.24). 순수 함수(자동 검사용).
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

/** 장애 뒤 오래 밀린 예약이 갑자기 올라가지 않도록, 예약 시각이 24시간 넘게 지난 글은 올리지 않는다(v1.24, 지침 docs/SCHEDULER_POLICY.md) */
export const MAX_LATE_MS = 24 * 60 * 60 * 1000;
export const TOO_LATE_MESSAGE = "예약 시각이 24시간 넘게 지나 자동으로 올리지 않았습니다. 내용을 확인하고 다시 예약하거나 바로 게시해 주세요.";

export function isTooLate(scheduledAt: string | null | undefined, now: number = Date.now()): boolean {
  const t = scheduledAt ? Date.parse(scheduledAt) : NaN;
  return Number.isFinite(t) && now - t > MAX_LATE_MS;
}

/** 예약 실행 실패 후 다시 시도까지 기다리는 시간(v1.20, 한 번만) */
export const RETRY_DELAY_MS = 10 * 60 * 1000;

/** 다시 시도할 만한 일시 오류인가 — 인스타 서버 지연·미디어 처리 지연·네트워크 끊김·5xx. 연결 만료·권한·형식 오류는 다시 해도 같으므로 제외 */
export function isTransientPublishError(message: string): boolean {
  if (/만료|권한|연결된 인스타그램 계정이 없|permission|expired|invalid|OAuth/i.test(message)) return false;
  return /timeout|timed out|너무 오래|fetch failed|network|ECONNRESET|ETIMEDOUT|socket|\((5\d\d)\)|temporarily|unavailable|try again|잠시 후/i.test(message);
}

/** 다시 시도 전 중복 확인 범위 — 최근 이 시간 안에 같은 캡션으로 올라간 글이 있으면 이미 게시된 것으로 본다(v1.21) */
export const DUPLICATE_WINDOW_MS = 60 * 60 * 1000;

export interface RecentMedia {
  caption?: string | null;
  timestamp?: string | null;
  permalink?: string | null;
}

/** 1차 시도 시작 추정 여유 — 1차 실패 기록 시각에서 이만큼 앞부터 본다(게시 처리 최대 5분 + 여유, v1.22) */
export const FIRST_ATTEMPT_MARGIN_MS = 10 * 60 * 1000;

/** 최근 게시물 중 같은 캡션(앞뒤 공백·줄바꿈 차이 무시)으로 기준 시각 이후 올라간 글을 찾는다. 캡션이 비면 비교하지 않는다.
 *  기준 시각 = 1차 실패 기록 시각 − 10분(알면), 최대 1시간 전까지 — 같은 캡션의 다른 글을 이미 게시된 것으로 오판하는 범위를 줄인다(v1.22) */
export function findSameRecentPost(media: RecentMedia[], caption: string, now: number = Date.now(), firstFailedAt?: number): RecentMedia | null {
  const norm = (t: string) => t.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
  const target = norm(caption);
  if (!target) return null;
  const since = Math.max(now - DUPLICATE_WINDOW_MS, firstFailedAt !== undefined && Number.isFinite(firstFailedAt) ? firstFailedAt - FIRST_ATTEMPT_MARGIN_MS : -Infinity);
  return (
    media.find((m) => {
      const at = m.timestamp ? Date.parse(m.timestamp) : NaN;
      return Number.isFinite(at) && at >= since && norm(m.caption ?? "") === target;
    }) ?? null
  );
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
