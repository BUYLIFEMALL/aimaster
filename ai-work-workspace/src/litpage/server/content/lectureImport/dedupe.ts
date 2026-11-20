// 강의 일정 한 번 가져오기 전용 — 중복 키와 판정(순수 함수, 입출력 없음).
// 2026-11-20 WS-20261118-02(플랜 docs/PLAN_20261120_NOTION_LECTURE_IMPORT.md §6-1).
// 키 = 정규화한 제목 + 시작일 + 시작 시각. 같은 키면 건너뛴다(기존 행을 고치거나 지우지 않는다).
// 이 파일은 아직 어디에서도 부르지 않는다.
import type { DateValue } from '#shared/richtext.ts';
import { isCalendarDate } from './lectureDates.ts';

/** 앞뒤 공백 제거 · 연속 공백 하나로 · 유니코드 NFC */
export function normalizeTitle(title: string): string {
  return (title ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * 비교용 시각 — 유효한 `H:mm`·`HH:mm`이면 `HH:mm`으로 맞춘다(표의 기존 행에 `9:00`처럼 자릿수를 채우지 않은 값이 있을 수 있다).
 * 시각이 없으면 빈 글자열, 유효한 시각이 아니면 null. 비교에만 쓰고 원본 값은 고치지 않는다.
 */
export function comparableTime(time: string | undefined | null): string | null {
  if (time === undefined || time === null || time === '') return '';
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** 중복 키. 하루 종일 일정은 시작 시각이 빈 값이라 같은 날 같은 제목의 일시 일정과 키가 다르다 */
export function dedupeKey(title: string, value: Pick<DateValue, 'start_date' | 'start_time'>): string {
  return `${normalizeTitle(title)}\u0000${value.start_date}\u0000${comparableTime(value.start_time) ?? value.start_time ?? ''}`;
}

/** 비교용으로 풀어 쓴 날짜 값 — 생략된 종료를 제품과 같은 뜻으로 채운 것(원본을 고친 것이 아니다) */
export interface ComparableDate {
  start_date: string;
  /** HH:mm, 하루 종일이면 빈 글자열 */
  start_time: string;
  range: boolean;
  /** 범위가 아니면 빈 글자열 */
  end_date: string;
  end_time: string;
}

const present = (x: unknown) => x !== undefined && x !== null && x !== '';

/**
 * 저장돼 있는 날짜 값이 제품 `DateValue`의 유형별 정상 표현이고 실제로 성립하는 값이면 비교용으로 풀어 돌려준다. 아니면 null.
 * 순서: 유형(`date`·`datetime`·`daterange`·`datetimerange`)에 맞는 칸 구성 → 달력에 있는 날짜 → 시각 → 종료가 시작보다 앞서지 않음.
 * - `date`: 시작일만. 시각·종료가 붙어 있으면 정상 표현이 아니다.
 * - `datetime`: 시작일 + 시작 시각(필수). 종료가 붙어 있으면 아니다.
 * - `daterange`: 시작일 + 종료일. 종료일을 생략하면 제품과 같이 시작일로 본다. 시각이 붙어 있으면 아니다.
 * - `datetimerange`: 시작일 + 시작 시각(필수) + 종료. 종료일을 생략하면 시작일(같은 날), 종료 시각을 생략하면 시작 시각으로 본다
 *   (`shared/database/dates.ts` `dateValueToRange`와 같은 해석).
 * 자릿수를 채우지 않은 시각(`9:00`)은 유효하면 `09:00`으로 맞춘다. 표시 형식·알림 같은 다른 칸은 보지 않는다.
 */
export function comparableValue(value: unknown): ComparableDate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const type = v.type;
  if (type !== 'date' && type !== 'datetime' && type !== 'daterange' && type !== 'datetimerange') return null;
  const timed = type === 'datetime' || type === 'datetimerange';
  const range = type === 'daterange' || type === 'datetimerange';
  if (!isCalendarDate(v.start_date)) return null;
  let startTime = '';
  if (timed) {
    const t = typeof v.start_time === 'string' ? comparableTime(v.start_time) : null;
    if (!t) return null; // 필수 시각이 없거나 깨짐
    startTime = t;
  } else if (present(v.start_time)) return null;
  if (!range) {
    if (present(v.end_date) || present(v.end_time)) return null;
    return { start_date: v.start_date, start_time: startTime, range: false, end_date: '', end_time: '' };
  }
  let endDate: string = v.start_date;
  if (present(v.end_date)) {
    if (!isCalendarDate(v.end_date)) return null;
    endDate = v.end_date;
  }
  let endTime = '';
  if (timed) {
    endTime = startTime;
    if (present(v.end_time)) {
      const t = typeof v.end_time === 'string' ? comparableTime(v.end_time) : null;
      if (!t) return null;
      endTime = t;
    }
  } else if (present(v.end_time)) return null;
  if (`${endDate}T${endTime}` < `${v.start_date}T${startTime}`) return null; // 종료가 시작보다 앞
  return { start_date: v.start_date, start_time: startTime, range: true, end_date: endDate, end_time: endTime };
}

/** 중복의 근거가 될 수 있는 행인가 — 제목이 있고 날짜 값이 유효한 행만(깨진 기존 행은 비교에서 뺀다) */
export function isComparable(title: string, value: DateValue | undefined | null): value is DateValue {
  return !!normalizeTitle(title) && comparableValue(value) !== null;
}

export interface ImportRow {
  /** 파일의 물리적 줄 번호 */
  line: number;
  title: string;
  value: DateValue;
}

export interface ExistingRow {
  id: string;
  title: string;
  value: DateValue;
}

export type DedupeReason = 'dup_file' | 'dup_table' | 'dup_table_end_differs';

export interface DedupeVerdict {
  line: number;
  result: 'created' | 'duplicate';
  reason?: DedupeReason;
  /** 근거: 파일 안 중복이면 앞선 줄 번호, 표의 기존 행이면 그 행 id */
  dupOf?: number | string;
  /** 같은 제목·같은 날인데 한쪽은 하루 종일, 한쪽은 시각 있음(키가 달라 둘 다 가져오지만 알려 준다) */
  similar?: boolean;
}

/** 종료(날짜·시각)가 같은가 — 범위가 아닌 값은 종료가 없는 것으로 보고, 생략된 종료는 제품과 같은 뜻으로 채워 비교한다 */
function sameEnd(a: DateValue, b: DateValue): boolean {
  const x = comparableValue(a);
  const y = comparableValue(b);
  if (!x || !y) return false;
  return x.end_date === y.end_date && x.end_time === y.end_time;
}

const dayKey = (title: string, v: DateValue) => `${normalizeTitle(title)}\u0000${v.start_date}`;

/**
 * 가져올 행들을 표의 기존 행·파일의 앞 줄과 대조한다. 입력 순서(파일 순서)를 그대로 돌려준다.
 * - 표의 기존 행과 키가 같으면 `dup_table`, 그중 종료가 다르면 `dup_table_end_differs`(근거를 보여 주기 위함, 덮어쓰지 않는다).
 * - 표에는 없고 파일의 앞 줄과 키가 같으면 `dup_file`.
 * - 이름이 다르면 같은 시각이어도 다른 일정이다.
 * - 근거가 되는 것은 실제로 저장돼 있는 유효한 행뿐이다: 제목이 비었거나 날짜 값이 `comparableValue`를 통과하지 못하는
 *   기존 행(유형에 맞지 않는 칸 구성·달력에 없는 날짜·필수 시각 없음·종료가 시작보다 앞)은 비교에서 뺀다.
 *   `rows`에는 앞 단계(구조·해석·시간대)를 통과한 줄만 넘긴다 — 실패·보류된 줄은 중복의 근거도 대상도 아니다.
 * - 기존 행의 `9:00`은 비교에서만 `09:00`으로 맞춘다. 입력 객체는 바꾸지 않는다.
 */
export function judgeDuplicates(rows: ImportRow[], existing: ExistingRow[]): DedupeVerdict[] {
  const inTable = new Map<string, ExistingRow>();
  const allDayOrTimedInTable = new Map<string, Set<boolean>>(); // 제목+날짜 → 그날 시각 유무
  for (const e of existing) {
    if (!isComparable(e.title, e.value)) continue;
    const k = dedupeKey(e.title, e.value);
    if (!inTable.has(k)) inTable.set(k, e); // 표에 이미 같은 키가 여럿이면 첫 행을 근거로 든다
    const d = dayKey(e.title, e.value);
    (allDayOrTimedInTable.get(d) ?? allDayOrTimedInTable.set(d, new Set()).get(d)!).add(!!e.value.start_time);
  }
  const inFile = new Map<string, number>();
  const allDayOrTimedInFile = new Map<string, Set<boolean>>();
  const out: DedupeVerdict[] = [];
  for (const r of rows) {
    const k = dedupeKey(r.title, r.value);
    const hit = inTable.get(k);
    if (hit) {
      out.push({ line: r.line, result: 'duplicate', reason: sameEnd(hit.value, r.value) ? 'dup_table' : 'dup_table_end_differs', dupOf: hit.id });
      continue;
    }
    const earlier = inFile.get(k);
    if (earlier !== undefined) {
      out.push({ line: r.line, result: 'duplicate', reason: 'dup_file', dupOf: earlier });
      continue;
    }
    inFile.set(k, r.line);
    const d = dayKey(r.title, r.value);
    const timed = !!r.value.start_time;
    const similar = !!allDayOrTimedInTable.get(d)?.has(!timed) || !!allDayOrTimedInFile.get(d)?.has(!timed);
    (allDayOrTimedInFile.get(d) ?? allDayOrTimedInFile.set(d, new Set()).get(d)!).add(timed);
    out.push({ line: r.line, result: 'created', ...(similar ? { similar: true } : {}) });
  }
  return out;
}
