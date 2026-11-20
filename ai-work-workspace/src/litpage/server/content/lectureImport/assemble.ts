// 강의 일정 한 번 가져오기 전용 — 판정 조립과 결과 계약(순수 함수, 입출력 없음).
// 2026-11-20 WS-20261118-02(플랜 docs/PLAN_20261120_NOTION_LECTURE_IMPORT.md §5-2).
// 순서: 구조(엄격 CSV) → 열 매핑 → 제목·날짜 해석 → 시간대 → 중복. 앞 단계에서 걸린 줄은 뒤 단계로 가지 않는다.
// 응답에는 줄 번호·결과 코드·사유 코드·중복 근거만 싣고 칸 내용은 싣지 않는다. 미리보기와 확정 저장이 같은 모양이다.
// 이 파일은 아직 어디에서도 부르지 않는다(API·DB·서명 표식·화면 연결은 다음 단위).
import type { DateValue } from '#shared/richtext.ts';
import { judgeDuplicates, type ExistingRow, type ImportRow } from './dedupe.ts';
import { isKnownTimeZone, parseLectureDate, resolveLectureDate } from './lectureDates.ts';
import { readStrictCsv, type StrictCsvFileError } from './strictCsv.ts';

/** 응답 본문 전체(봉투 포함, UTF-8 JSON)의 상한 — 가져오기 응답 예산과 같은 값 */
export const LECTURE_RESPONSE_BUDGET = 3_000_000;

export type RowResult = 'created' | 'duplicate' | 'failed' | 'tz_mismatch';

/** 사유 코드 — 정해 둔 낱말뿐이다(칸 내용·원문을 싣지 않는다) */
export type RowReason =
  | '' // 새로 넣음(특이 사항 없음)
  | 'wall_clock' // 새로 넣음: 표기와 다른 시간대로, 벽시계 값 그대로(명시 선택)
  | 'similar' // 새로 넣음: 같은 제목·같은 날에 하루 종일/시각 있는 일정이 따로 있음
  | 'column_count'
  | 'title_missing'
  | 'empty'
  | 'unsupported_format'
  | 'invalid_date'
  | 'invalid_time'
  | 'seconds_unsupported'
  | 'zone_unsupported'
  | 'range_time_one_side'
  | 'end_before_start'
  | 'time_nonexistent'
  | 'time_ambiguous'
  | 'tz_start' // 시간대 불일치: 시작 쪽 표기
  | 'tz_end'
  | 'tz_both'
  | 'dup_file'
  | 'dup_table'
  | 'dup_table_end_differs';

/** [물리 줄 번호, 결과 코드, 사유 코드] */
export type RowEntry = [number, RowResult, RowReason];

export interface LectureTotals {
  /** 데이터 행 전체(빈 줄 제외, 열 수가 틀린 줄 포함) — created + duplicate + failed + tz_mismatch */
  rows: number;
  created: number;
  duplicate: number;
  failed: number;
  tz_mismatch: number;
  /** 부분집계: created 가운데 명시 벽시계 예외로 넣는 행(created에 이미 포함) */
  wall_clock: number;
}

/** 파일 전체를 판정하지 않고 멈추는 오류(0쓰기) */
export type AssembleFileError =
  | StrictCsvFileError
  | { code: 'zone_invalid' } // 고를 수 없는 시간대
  | { code: 'title_column_missing' }
  | { code: 'date_column_missing' }
  | { code: 'same_column' }; // 제목 열과 날짜 열이 같음

export interface AssembleInput {
  /** 올린 파일의 원본 글자열 */
  csv: string;
  /** 머리줄의 열 이름(앞뒤 공백 제거한 값과 정확히 같아야 한다) */
  mapping: { title: string; date: string };
  timeZone: string;
  /** 「표기된 시각 그대로 가져오기」 명시 선택 */
  wallClock?: boolean;
  /** 대상 표의 기존 행(새 표면 빈 배열) */
  existing: ExistingRow[];
}

export interface Judged {
  totals: LectureTotals;
  /** 파일의 물리 줄 순서 */
  rows: RowEntry[];
  /** rows와 같은 순서·같은 길이: 중복이면 근거(파일의 앞선 줄 번호 또는 표의 기존 행 id), 아니면 null */
  dupOf: (number | string | null)[];
  /** 실제로 넣을 행(created) — 응답에는 싣지 않는다. 저장 단계가 쓴다 */
  toWrite: { line: number; title: string; value: DateValue }[];
}

export type AssembleResult = { ok: false; error: AssembleFileError } | ({ ok: true } & Judged);

/**
 * 파일 하나를 끝까지 판정한다. 같은 입력이면 같은 결과다(시각·난수·입력 순서 밖의 것에 기대지 않는다).
 * 미리보기와 확정 저장이 이 함수를 똑같이 부른다 — 확정 저장은 잠금을 잡은 뒤의 최신 `existing`으로 다시 부른다.
 */
export function assembleLectureImport(input: AssembleInput): AssembleResult {
  const { mapping, timeZone } = input;
  // 1) 구조: 따옴표·줄 경계가 가장 먼저다. 여기서 걸리면 아래 단계는 돌지 않는다
  const csv = readStrictCsv(input.csv);
  if (!csv.ok) return { ok: false, error: csv.error };
  // 2) 요청 자체의 오류(파일 전체)
  if (!isKnownTimeZone(timeZone)) return { ok: false, error: { code: 'zone_invalid' } };
  const titleAt = csv.header.indexOf(mapping.title);
  const dateAt = csv.header.indexOf(mapping.date);
  if (titleAt < 0) return { ok: false, error: { code: 'title_column_missing' } };
  if (dateAt < 0) return { ok: false, error: { code: 'date_column_missing' } };
  if (titleAt === dateAt) return { ok: false, error: { code: 'same_column' } };

  const verdict = new Map<number, { result: RowResult; reason: RowReason; dupOf: number | string | null }>();
  const put = (line: number, result: RowResult, reason: RowReason, dupOf: number | string | null = null) => verdict.set(line, { result, reason, dupOf });
  for (const e of csv.rowErrors) put(e.line, 'failed', 'column_count');

  // 3) 제목·날짜 해석 → 4) 시간대. 통과한 줄만 중복 판정으로 넘긴다
  const passed: (ImportRow & { wallClock: boolean })[] = [];
  for (const r of csv.rows) {
    const title = r.cells[titleAt].trim();
    if (!title.replace(/\s+/g, '')) {
      put(r.line, 'failed', 'title_missing');
      continue;
    }
    const parsed = parseLectureDate(r.cells[dateAt]);
    if (!parsed.ok) {
      put(r.line, 'failed', parsed.code);
      continue;
    }
    const resolved = resolveLectureDate(parsed, timeZone, { wallClock: !!input.wallClock });
    if (!resolved.ok) {
      if (resolved.code === 'tz_mismatch') put(r.line, 'tz_mismatch', resolved.side === 'both' ? 'tz_both' : resolved.side === 'end' ? 'tz_end' : 'tz_start');
      else if (resolved.code === 'zone_invalid') return { ok: false, error: { code: 'zone_invalid' } }; // 위에서 걸렀으므로 오지 않는다
      else put(r.line, 'failed', resolved.code);
      continue;
    }
    passed.push({ line: r.line, title, value: resolved.value, wallClock: resolved.wallClock });
  }

  // 5) 중복: 실제로 저장돼 있는 유효한 행과, 이번에 넣기로 한 앞 줄만 근거가 된다
  const toWrite: Judged['toWrite'] = [];
  const dup = judgeDuplicates(passed, input.existing);
  dup.forEach((d, i) => {
    const row = passed[i];
    if (d.result === 'duplicate') put(d.line, 'duplicate', d.reason ?? 'dup_table', d.dupOf ?? null);
    else {
      put(d.line, 'created', row.wallClock ? 'wall_clock' : d.similar ? 'similar' : '');
      toWrite.push({ line: row.line, title: row.title, value: row.value });
    }
  });

  const lines = [...verdict.keys()].sort((a, b) => a - b);
  const totals: LectureTotals = { rows: lines.length, created: 0, duplicate: 0, failed: 0, tz_mismatch: 0, wall_clock: 0 };
  const rows: RowEntry[] = [];
  const dupOf: (number | string | null)[] = [];
  for (const line of lines) {
    const v = verdict.get(line)!;
    totals[v.result]++;
    if (v.result === 'created' && v.reason === 'wall_clock') totals.wall_clock++;
    rows.push([line, v.result, v.reason]);
    dupOf.push(v.dupOf);
  }
  return { ok: true, totals, rows, dupOf, toWrite };
}

/** 확정 저장 응답에만 붙는 칸 */
export interface WrittenInfo {
  /** 이 요청이 실제로 넣은 행의 전체 수(벽시계 예외로 넣은 행 포함) */
  rows: number;
  /** 대상 표 블록 id */
  tableId: string;
  /** 이 요청이 표를 새로 만들었는가 */
  createdTable: boolean;
}

export interface LectureResponse {
  totals: LectureTotals;
  rows: RowEntry[];
  dupOf: (number | string | null)[];
  /** 예산 때문에 뒤에서 잘라 낸 행 수(잘리지 않았으면 이 칸이 없다) */
  rowsOmitted?: number;
  written?: WrittenInfo;
}

/** 응답 본문의 실제 크기(UTF-8 JSON 바이트) */
export function responseBytes(body: unknown): number {
  return Buffer.byteLength(JSON.stringify(body), 'utf8');
}

/**
 * 판정 결과를 응답 본문으로 만든다. 본문 전체의 실제 직렬화 크기가 예산을 넘으면 `rows`·`dupOf`를 **뒤에서부터** 같은 수만큼
 * 잘라 내고 `rowsOmitted`를 붙인다. `totals`와 `written`은 절대 자르지 않는다.
 * 예산이 봉투(합계·written)보다도 작으면 `rows`를 모두 빼고 돌려준다 — 그때는 본문이 예산을 넘을 수 있으며 `responseBytes`로 확인한다
 * (기본 예산 3,000,000바이트에서는 일어나지 않는다).
 */
export function buildLectureResponse(judged: Pick<Judged, 'totals' | 'rows' | 'dupOf'>, opts: { written?: WrittenInfo; budget?: number } = {}): LectureResponse {
  const budget = opts.budget ?? LECTURE_RESPONSE_BUDGET;
  const totals = { ...judged.totals };
  const make = (keep: number): LectureResponse => ({
    totals,
    rows: judged.rows.slice(0, keep),
    dupOf: judged.dupOf.slice(0, keep),
    ...(keep < judged.rows.length ? { rowsOmitted: judged.rows.length - keep } : {}),
    ...(opts.written ? { written: { ...opts.written } } : {}),
  });
  const full = make(judged.rows.length);
  if (responseBytes(full) <= budget) return full;
  // 들어가는 가장 긴 앞부분을 찾는다(행이 늘수록 크기도 늘므로 이분 탐색)
  let lo = 0;
  let hi = judged.rows.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (responseBytes(make(mid)) <= budget) lo = mid;
    else hi = mid - 1;
  }
  return make(lo);
}
