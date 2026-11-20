// 강의 일정 한 번 가져오기 전용 — 날짜·시각·시간대 해석(순수 함수, 입출력 없음).
// 2026-11-20 WS-20261118-02(플랜 docs/PLAN_20261120_NOTION_LECTURE_IMPORT.md §4).
// 원칙: 표에 적힌 표기만 받고 그 밖은 추정 없이 실패. 시각은 변환하지 않는다(파일의 벽시계 값 그대로).
// 숫자 오프셋·이름 표기는 지역 이름으로 바꾸지 않고, 회원이 고른 시간대의 그 일시 오프셋과 비교하는 데만 쓴다.
// 기존 csv.ts의 parseDateCell(날짜만)은 건드리지 않는다. 이 파일은 아직 어디에서도 부르지 않는다.
import type { DateValue } from '#shared/richtext.ts';

/** 파일에 적힌 시간대 표기 — 분 단위 오프셋으로만 보관한다(지역 이름 아님) */
export interface ZoneMark {
  /** UTC보다 앞선 분(서울 +540) */
  offsetMinutes: number;
  /** 원문이 이름 표기였는가(KST·UTC·GMT) — 안내 문구용 */
  named: boolean;
}

export interface Endpoint {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm (없으면 하루 종일) */
  time?: string;
  zone?: ZoneMark;
}

export type DateParseError =
  | 'empty'
  | 'unsupported_format' // 지원 표에 없는 표기
  | 'invalid_date' // 달력에 없는 날짜
  | 'invalid_time' // 00:00~23:59 밖, 12시간 표기 오류
  | 'seconds_unsupported' // 초가 적힌 시각 — 저장 정밀도가 분이라 받지 않는다(조용히 버리지 않음)
  | 'zone_unsupported' // KST·UTC·GMT·GMT±H 밖의 시간대 표기
  | 'range_time_one_side' // 범위의 한쪽에만 시각
  | 'end_before_start';

export type DateParse = { ok: true; start: Endpoint; end?: Endpoint } | { ok: false; code: DateParseError };

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const pad2 = (n: number) => String(n).padStart(2, '0');

function daysInMonth(y: number, m: number): number {
  if (m === 2) return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

/** 연·월·일을 직접 확인한다(Date의 자동 넘김에 기대지 않는다) */
function ymd(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;
}

type TimeRead = { time: string } | { code: 'invalid_time' | 'seconds_unsupported' } | undefined;

/** `YYYY-MM-DD` 모양이고 달력에 실제로 있는 날짜인가(중복 판정이 기존 행의 값을 볼 때도 쓴다) */
export function isCalendarDate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return !!m && ymd(Number(m[1]), Number(m[2]), Number(m[3])) === s;
}

/** 시각 글자열 → HH:mm. 못 읽는 모양이면 undefined(형식 아님), 모양은 맞는데 받지 않는 값이면 사유 */
function parseTime(src: string): TimeRead {
  const s = src.trim();
  // 오전/오후 h:mm, AM/PM h:mm(앞) 또는 h:mm AM/PM(뒤)
  let m = /^(오전|오후|AM|PM)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/i.exec(s);
  let ampm: string | undefined;
  let h: number;
  let mi: number;
  let sec: string | undefined;
  if (m) {
    ampm = m[1];
    h = Number(m[2]);
    mi = Number(m[3]);
    sec = m[4];
  } else {
    m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|오전|오후)?$/i.exec(s);
    if (!m) return undefined;
    h = Number(m[1]);
    mi = Number(m[2]);
    sec = m[3];
    ampm = m[4];
  }
  if (sec !== undefined) return { code: 'seconds_unsupported' }; // 10:00:30은 물론 10:00:00도 받지 않는다
  if (mi > 59) return { code: 'invalid_time' };
  if (ampm) {
    if (h < 1 || h > 12) return { code: 'invalid_time' }; // 13:00 PM, 0:30 AM
    const pm = /^(pm|오후)$/i.test(ampm);
    h = (h % 12) + (pm ? 12 : 0);
  } else if (h > 23) return { code: 'invalid_time' }; // 24:00
  return { time: `${pad2(h)}:${pad2(mi)}` };
}

/** 표기 오프셋의 절댓값 상한(분) — 14:00 */
export const MAX_MARK_OFFSET_MINUTES = 14 * 60;

/** 끝의 "(GMT+9)" 같은 표기를 떼어 낸다 */
function splitZone(src: string): { rest: string; zone?: ZoneMark } | 'zone_unsupported' {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(src);
  if (!m) return { rest: src };
  const mark = m[2].trim().toUpperCase();
  if (mark === 'KST') return { rest: m[1], zone: { offsetMinutes: 540, named: true } };
  if (mark === 'UTC' || mark === 'GMT') return { rest: m[1], zone: { offsetMinutes: 0, named: true } };
  const o = /^(?:GMT|UTC)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/.exec(mark);
  if (!o) return 'zone_unsupported';
  const hh = Number(o[2]);
  const mm = o[3] === undefined ? 0 : Number(o[3]);
  // 절댓값 14:00까지(GMT+14·GMT-14:00은 받고 GMT+14:01은 받지 않는다). 실제로 맞는 값인지는 시간대 판정이 가린다
  if (mm > 59 || hh * 60 + mm > MAX_MARK_OFFSET_MINUTES) return 'zone_unsupported';
  const minutes = hh * 60 + mm;
  return { rest: m[1], zone: { offsetMinutes: o[1] === '-' && minutes ? -minutes : minutes, named: false } }; // GMT-0은 0(음의 0이 아님)
}

/** 한쪽 끝을 읽는다. dateFrom이 있으면 「시각만」 표기를 그 날짜로 본다(같은 날 범위의 종료) */
function parseEndpoint(src: string, dateFrom?: string): { ok: true; value: Endpoint } | { ok: false; code: DateParseError } {
  const z = splitZone(src.trim());
  if (z === 'zone_unsupported') return { ok: false, code: 'zone_unsupported' };
  const s = z.rest.trim();
  if (!s) return { ok: false, code: 'unsupported_format' };
  let date: string | null | undefined;
  let timePart = '';
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]\s*(.+))?$/.exec(s); // 2026-11-20 [10:00]
  if (m) {
    date = ymd(Number(m[1]), Number(m[2]), Number(m[3]));
    timePart = m[4] ?? '';
  } else if ((m = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s+(.+))?$/.exec(s))) {
    date = ymd(Number(m[1]), Number(m[2]), Number(m[3])); // 2026년 11월 20일 [오전 10:00]
    timePart = m[4] ?? '';
  } else if ((m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})(?:\s+(.+))?$/.exec(s))) {
    const mo = MONTHS.indexOf(m[1].toLowerCase()); // November 20, 2026 [10:00 AM]
    if (mo < 0) return { ok: false, code: 'unsupported_format' };
    date = ymd(Number(m[3]), mo + 1, Number(m[2]));
    timePart = m[4] ?? '';
  } else if (dateFrom) {
    const t = parseTime(s); // 시각만: 같은 날 범위의 종료
    if (t === undefined) return { ok: false, code: 'unsupported_format' };
    if ('code' in t) return { ok: false, code: t.code };
    return { ok: true, value: { date: dateFrom, time: t.time, ...(z.zone ? { zone: z.zone } : {}) } };
  } else return { ok: false, code: 'unsupported_format' };
  if (!date) return { ok: false, code: 'invalid_date' };
  if (!timePart) return { ok: true, value: { date, ...(z.zone ? { zone: z.zone } : {}) } };
  const t = parseTime(timePart);
  if (t === undefined) return { ok: false, code: 'unsupported_format' };
  if ('code' in t) return { ok: false, code: t.code };
  return { ok: true, value: { date, time: t.time, ...(z.zone ? { zone: z.zone } : {}) } };
}

/** 범위 구분자: →, 양쪽에 공백이 있는 ~ · – · - */
const RANGE_SEP = /\s*→\s*|\s+~\s+|\s+–\s+|\s+-\s+/;

/**
 * 날짜 칸 하나를 읽는다(시간대 판정 전 단계). 시작과 종료를 각각 따로 검증한다.
 * - 한쪽에만 시각이 있는 범위는 실패(빠진 시각을 채우지 않는다). 단 종료가 「시각만」이면 시작 날짜의 그 시각.
 * - 종료가 시작보다 앞서면 실패.
 * - 벽시계 값이 같은 범위도 여기서 줄이지 않고 양 끝을 그대로 돌려준다. 종료에만 적힌 시간대 표기를 검사 없이
 *   버리지 않기 위함이다 — 한 값으로 줄이는 것은 시간대 판정(resolveLectureDate)이 양 끝을 검사한 뒤에 한다.
 */
export function parseLectureDate(raw: string): DateParse {
  const s = (raw ?? '').trim();
  if (!s) return { ok: false, code: 'empty' };
  const parts = s.split(RANGE_SEP);
  if (parts.length > 2) return { ok: false, code: 'unsupported_format' };
  const a = parseEndpoint(parts[0]);
  if (!a.ok) return a;
  if (parts.length === 1) return { ok: true, start: a.value };
  const b = parseEndpoint(parts[1], a.value.time ? a.value.date : undefined);
  if (!b.ok) return b;
  if (!!a.value.time !== !!b.value.time) return { ok: false, code: 'range_time_one_side' };
  const key = (e: Endpoint) => `${e.date}T${e.time ?? '00:00'}`;
  if (key(b.value) < key(a.value)) return { ok: false, code: 'end_before_start' };
  return { ok: true, start: a.value, end: b.value };
}

// ── 시간대 ─────────────────────────────────────────────────────────────────

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmtFor(timeZone: string): Intl.DateTimeFormat | null {
  let f = fmtCache.get(timeZone);
  if (f) return f;
  try {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  } catch {
    return null;
  }
  fmtCache.set(timeZone, f);
  return f;
}

let supportedZones: Set<string> | null = null;

/**
 * 고를 수 있는 시간대인가 — `UTC`와 런타임이 지원 목록으로 내주는 IANA 지역 이름만.
 * 날짜 포매터는 `+09:00` 같은 원시 오프셋과 `Etc/GMT-9` 같은 고정 오프셋 이름도 받아 주지만, 오프셋은 지역이 아니라서
 * 서머타임 판정이 무의미해지므로 여기서 막는다. 목록에 없는 값(옛 별칭·대소문자 다른 것·앞뒤 공백)도 받지 않는다.
 */
export function isKnownTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  if (timeZone === 'UTC') return true;
  supportedZones ??= new Set(Intl.supportedValuesOf('timeZone'));
  return supportedZones.has(timeZone) && !!fmtFor(timeZone);
}

/** 그 순간(UTC ms)에 이 시간대가 UTC보다 앞선 분 */
function offsetAt(utcMs: number, f: Intl.DateTimeFormat): number {
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(new Date(utcMs))) if (x.type !== 'literal') p[x.type] = Number(x.value);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60_000);
}

/**
 * 이 시간대에서 벽시계 일시(date, time)에 대응하는 순간들의 오프셋(분) 목록.
 * 길이 0 = 없는 시각(시계를 앞으로 돌린 구간), 1 = 보통, 2 = 두 번 있는 시각(뒤로 돌린 구간).
 */
export function wallClockOffsets(date: string, time: string, timeZone: string): number[] | null {
  const f = isKnownTimeZone(timeZone) ? fmtFor(timeZone) : null;
  if (!f) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  // 앞뒤 하루의 오프셋을 후보로 삼아, 그 오프셋으로 되돌렸을 때 실제로 같은 오프셋이 나오는 것만 남긴다
  const candidates = new Set<number>();
  for (const delta of [-86_400_000, 0, 86_400_000]) candidates.add(offsetAt(wallAsUtc + delta, f));
  const hits: number[] = [];
  for (const off of candidates) if (offsetAt(wallAsUtc - off * 60_000, f) === off) hits.push(off);
  return hits.sort((a, b) => a - b);
}

export type ResolveError =
  | 'zone_invalid' // 고른 시간대 이름을 모름
  | 'time_nonexistent' // 이 시간대에서 없는 시각
  | 'time_ambiguous' // 이 시간대에서 두 번 있는 시각
  | 'tz_mismatch' // 표기가 그 일시의 실제 오프셋과 다름
  | 'end_before_start'; // 벽시계로는 뒤지만 실제 순간은 앞(서머타임 경계)

export type Side = 'start' | 'end' | 'both';

export type Resolved =
  | { ok: true; value: DateValue; /** 표기와 다른 시간대로 저장됨(명시 벽시계 예외) */ wallClock: boolean }
  | { ok: false; code: ResolveError; side?: Side };

/**
 * 읽은 날짜를 회원이 고른 시간대로 판정해 저장 값으로 만든다.
 * - 시각은 옮기지 않는다. `time_zone`에는 고른 시간대 하나만 들어간다.
 * - 없는 시각·두 번 있는 시각은 저장하지 않는다(`DateValue`에 어느 쪽인지 적을 칸이 없다). 예외 선택으로도 살리지 않는다.
 * - 표기는 시작·종료를 각자의 일시 오프셋과 비교한다. 서머타임 경계를 넘어 양 끝 오프셋이 달라도 각자 맞으면 정상.
 * - `wallClock: true`(명시 선택)면 표기 불일치만 그대로 저장한다.
 * - 벽시계 값이 같은 범위는 위 검사를 양 끝에 모두 한 뒤에 한 값으로 줄인다.
 */
export function resolveLectureDate(parsed: { start: Endpoint; end?: Endpoint }, timeZone: string, opts: { wallClock?: boolean } = {}): Resolved {
  if (!isKnownTimeZone(timeZone)) return { ok: false, code: 'zone_invalid' };
  const { start, end } = parsed;
  const sides: [Side, Endpoint][] = end ? [['start', start], ['end', end]] : [['start', start]];
  const instants: number[] = [];
  const mismatched: Side[] = [];
  for (const [side, e] of sides) {
    if (!e.time) {
      // 하루 종일: 시각이 없어 서머타임 판정 대상이 아니다. 표기가 있으면 그날 정오의 오프셋과 비교한다
      if (e.zone) {
        const offs = wallClockOffsets(e.date, '12:00', timeZone) ?? [];
        if (offs.length !== 1 || offs[0] !== e.zone.offsetMinutes) mismatched.push(side);
      }
      continue;
    }
    const offs = wallClockOffsets(e.date, e.time, timeZone) ?? [];
    if (offs.length === 0) return { ok: false, code: 'time_nonexistent', side };
    if (offs.length > 1) return { ok: false, code: 'time_ambiguous', side };
    const [y, mo, d] = e.date.split('-').map(Number);
    const [h, mi] = e.time.split(':').map(Number);
    instants.push(Date.UTC(y, mo - 1, d, h, mi, 0) - offs[0] * 60_000);
    if (e.zone && e.zone.offsetMinutes !== offs[0]) mismatched.push(side);
  }
  if (instants.length === 2 && instants[1] < instants[0]) return { ok: false, code: 'end_before_start' };
  if (mismatched.length && !opts.wallClock) return { ok: false, code: 'tz_mismatch', side: mismatched.length === 2 ? 'both' : mismatched[0] };
  const hasTime = !!start.time;
  // 양 끝 검사가 끝난 뒤에만 줄인다: 종료가 시작과 같은 벽시계 값이면 범위가 아니라 단일 값
  const range = !!end && !(end.date === start.date && (end.time ?? '') === (start.time ?? ''));
  const value: DateValue = range && end
    ? hasTime
      ? { type: 'datetimerange', start_date: start.date, start_time: start.time, end_date: end.date, end_time: end.time, time_zone: timeZone }
      : { type: 'daterange', start_date: start.date, end_date: end.date }
    : hasTime
      ? { type: 'datetime', start_date: start.date, start_time: start.time, time_zone: timeZone }
      : { type: 'date', start_date: start.date };
  return { ok: true, value, wallClock: mismatched.length > 0 };
}
