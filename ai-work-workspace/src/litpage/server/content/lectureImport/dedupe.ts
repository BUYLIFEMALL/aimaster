// 강의 일정 한 번 가져오기 전용 — 중복 키와 판정(순수 함수, 입출력 없음).
// 2026-11-20 WS-20261118-02(플랜 docs/PLAN_20261120_NOTION_LECTURE_IMPORT.md §6-1).
// 키 = 정규화한 제목 + 시작일 + 시작 시각. 같은 키면 건너뛴다(기존 행을 고치거나 지우지 않는다).
// 이 파일은 아직 어디에서도 부르지 않는다.
import type { DateValue } from '#shared/richtext.ts';

/** 앞뒤 공백 제거 · 연속 공백 하나로 · 유니코드 NFC */
export function normalizeTitle(title: string): string {
  return (title ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** 중복 키. 하루 종일 일정은 시작 시각이 빈 값이라 같은 날 같은 제목의 일시 일정과 키가 다르다 */
export function dedupeKey(title: string, value: Pick<DateValue, 'start_date' | 'start_time'>): string {
  return `${normalizeTitle(title)}\u0000${value.start_date}\u0000${value.start_time ?? ''}`;
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

/** 종료(날짜·시각)가 같은가 — 범위가 아닌 값은 종료가 없는 것으로 본다 */
function sameEnd(a: DateValue, b: DateValue): boolean {
  return (a.end_date ?? '') === (b.end_date ?? '') && (a.end_time ?? '') === (b.end_time ?? '');
}

const dayKey = (title: string, v: DateValue) => `${normalizeTitle(title)}\u0000${v.start_date}`;

/**
 * 가져올 행들을 표의 기존 행·파일의 앞 줄과 대조한다. 입력 순서(파일 순서)를 그대로 돌려준다.
 * - 표의 기존 행과 키가 같으면 `dup_table`, 그중 종료가 다르면 `dup_table_end_differs`(근거를 보여 주기 위함, 덮어쓰지 않는다).
 * - 표에는 없고 파일의 앞 줄과 키가 같으면 `dup_file`.
 * - 이름이 다르면 같은 시각이어도 다른 일정이다.
 */
export function judgeDuplicates(rows: ImportRow[], existing: ExistingRow[]): DedupeVerdict[] {
  const inTable = new Map<string, ExistingRow>();
  const allDayOrTimedInTable = new Map<string, Set<boolean>>(); // 제목+날짜 → 그날 시각 유무
  for (const e of existing) {
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
