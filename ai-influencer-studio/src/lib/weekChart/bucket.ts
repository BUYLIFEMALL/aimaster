// 최근 7일 응대 그래프의 날짜 나누기 — 공용 기준 코드(docs/SHARED_MODULES.md 「week-reply-chart」).
// 기준: comment-inbox. 사본은 직접 고치지 말고 기준을 고친 뒤 node scripts/check-shared-modules.mjs --sync.
// 서버·브라우저·시험 어디서나 쓰는 순수 함수만 둔다(DB 접속 없음).

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_MS = 9 * 60 * 60 * 1000;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** 한국 시간 오늘 0시(UTC ISO) */
export function kstTodayStartIso(now = Date.now()): string {
  const kst = new Date(now + KST_MS);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - KST_MS).toISOString();
}

/** 한국 시간 날짜(YYYY-MM-DD)의 0시~다음 날 0시(UTC ISO). 날짜 형식이 아니면 null */
export function kstDayRange(dayKey: string): { from: string; to: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return null;
  const start = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - KST_MS;
  if (Number.isNaN(start)) return null;
  return { from: new Date(start).toISOString(), to: new Date(start + DAY_MS).toISOString() };
}

/** 7일 칸의 시작(한국 시간 6일 전 0시, UTC ISO) — 조회 조건에 쓴다 */
export function weekStartIso(now = Date.now()): string {
  return new Date(new Date(kstTodayStartIso(now)).getTime() - 6 * DAY_MS).toISOString();
}

export type DayCount = {
  key: string;
  label: string;
  weekday: string;
  count: number;
  /** 플랫폼(묶음) 이름별 건수 — 묶음 없이 센 시각은 들어가지 않는다 */
  bySeries: Record<string, number>;
};

/**
 * 처리 시각 목록을 한국 시간 날짜별로 센다 — 오늘 포함 최근 7일, 오래된 날부터. 범위 밖 시각은 버린다.
 * 항목은 시각 문자열 또는 { at, series }(쌓는 막대의 묶음 이름).
 */
export function bucketByKstDay(entries: (string | { at: string; series?: string })[], now = Date.now()): DayCount[] {
  const todayStart = new Date(kstTodayStartIso(now)).getTime();
  const days: DayCount[] = [];
  for (let i = 6; i >= 0; i--) {
    const kst = new Date(todayStart - i * DAY_MS + KST_MS);
    days.push({
      key: kst.toISOString().slice(0, 10),
      label: `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`,
      weekday: WEEKDAY[kst.getUTCDay()],
      count: 0,
      bySeries: {},
    });
  }
  const index = new Map(days.map((d, i) => [d.key, i]));
  for (const e of entries) {
    const at = typeof e === "string" ? e : e.at;
    const i = index.get(new Date(new Date(at).getTime() + KST_MS).toISOString().slice(0, 10));
    if (i === undefined) continue;
    days[i].count++;
    const series = typeof e === "string" ? undefined : e.series;
    if (series) days[i].bySeries[series] = (days[i].bySeries[series] ?? 0) + 1;
  }
  return days;
}

/** 막대를 눌렀을 때 쓰는 하루 범위 — 최근 7일(오늘 포함) 안의 날짜만, 아니면 null */
export function weekDayRange(dayKey: string, now = Date.now()): { from: string; to: string } | null {
  const range = kstDayRange(dayKey);
  if (!range || range.from < weekStartIso(now) || range.from > kstTodayStartIso(now)) return null;
  return range;
}

/** 목록에 보일 앞부분(공백 정리, 기본 80자) */
export function previewText(text: string | null | undefined, max = 80): string {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * 그날 목록 썸네일 주소 — 이미 전체 주소면 그대로(쉼표로 이어진 여러 주소면 첫 번째), 저장소 안 경로면 공개 저장소 주소로.
 * 배열이면 첫 장. 값이 없거나 Supabase 주소를 모르면 null.
 */
export function publicImageUrl(value: string | string[] | null | undefined, bucket: string): string | null {
  const first = (Array.isArray(value) ? value[0] : value?.split(",")[0])?.trim();
  if (!first) return null;
  if (/^https?:\/\//.test(first)) return first;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${first.split("/").map(encodeURIComponent).join("/")}`;
}
