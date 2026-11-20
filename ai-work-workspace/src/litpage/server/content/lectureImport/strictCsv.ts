// 강의 일정 한 번 가져오기 전용 — 엄격한 CSV 판독기(순수 함수, 입출력 없음).
// 2026-11-20 WS-20261118-02(플랜 docs/PLAN_20261120_NOTION_LECTURE_IMPORT.md §3-1).
// 기존 csv.ts의 parseCsv는 관대하게 읽는다(구분자 추정, 모자란 칸 허용). 그 동작은 그대로 두고, 여기서는 따로
// 원본 글자열에서 따옴표와 줄 경계를 가장 먼저 판정한다. 줄을 먼저 나누면 여러 줄 칸과 닫히지 않은 따옴표를
// 구분할 수 없고 줄 번호가 틀어지기 때문이다. 이 파일은 아직 어디에서도 부르지 않는다.

export const STRICT_CSV_MAX_ROWS = 10_000;

/** 파일 전체를 거절하는 구조 오류 */
export type StrictCsvFileError =
  | { code: 'unterminated_quote'; line: number } // 따옴표가 파일 끝까지 닫히지 않음 — line은 따옴표가 열린 줄
  | { code: 'text_after_closing_quote'; line: number } // 닫힌 따옴표 뒤에 구분자·줄 끝이 아닌 글자
  | { code: 'quote_in_unquoted_field'; line: number } // 따옴표 없이 시작한 칸 안의 따옴표
  | { code: 'no_header' } // 머리줄이 없거나 전부 빈 칸
  | { code: 'empty_header_name'; column: number } // 이름이 빈 열(1부터)
  | { code: 'duplicate_header'; column: number } // 같은 이름의 열이 앞에 있음(1부터)
  | { code: 'too_many_rows'; limit: number };

/** 그 줄만 실패 처리하는 오류 */
export type StrictCsvRowError = { line: number; code: 'column_count'; expected: number; got: number };

export interface StrictCsvRow {
  /** 이 행이 시작한 물리적 줄 번호(머리줄이 1). 여러 줄 칸이 있어도 시작 줄 */
  line: number;
  cells: string[];
}

export type StrictCsvResult =
  | { ok: false; error: StrictCsvFileError }
  | { ok: true; header: string[]; rows: StrictCsvRow[]; rowErrors: StrictCsvRowError[] };

interface RawRecord {
  line: number;
  cells: string[];
  /** 따옴표 없는 빈 칸 하나뿐인 줄(빈 줄) */
  blank: boolean;
}

/** 원본 글자열을 한 글자씩 읽어 레코드로 나눈다. 따옴표 오류는 여기서 바로 돌려준다 */
function scan(text: string): { ok: false; error: StrictCsvFileError } | { ok: true; records: RawRecord[] } {
  const records: RawRecord[] = [];
  const n = text.length;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; // BOM은 맨 앞 한 번만
  let line = 1; // 지금 읽는 글자의 물리적 줄
  let recordLine = 1;
  let cells: string[] = [];
  let field = '';
  let quoted = false; // 이 칸이 따옴표로 시작했는가
  let anyQuoted = false; // 이 레코드에 따옴표 칸이 있었는가
  let atFieldStart = true;

  const endField = () => {
    cells.push(field);
    field = '';
    quoted = false;
    atFieldStart = true;
  };
  const endRecord = () => {
    endField();
    records.push({ line: recordLine, cells, blank: cells.length === 1 && cells[0] === '' && !anyQuoted });
    cells = [];
    anyQuoted = false;
  };
  /** i가 줄 끝 글자면 그 길이(1 또는 2), 아니면 0 */
  const eol = (at: number) => (text[at] === '\r' ? (text[at + 1] === '\n' ? 2 : 1) : text[at] === '\n' ? 1 : 0);

  while (i < n) {
    const ch = text[i];
    if (atFieldStart && ch === '"') {
      // 따옴표 칸: 닫는 따옴표까지 그대로 읽는다(줄바꿈 포함)
      const openedAt = line;
      quoted = true;
      anyQuoted = true;
      atFieldStart = false;
      i++;
      let closed = false;
      while (i < n) {
        const c = text[i];
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        const e = eol(i);
        if (e) {
          field += text.slice(i, i + e); // 칸 안의 줄바꿈은 원문 그대로 보존
          line++;
          i += e;
          continue;
        }
        field += c;
        i++;
      }
      if (!closed) return { ok: false, error: { code: 'unterminated_quote', line: openedAt } };
      // 닫힌 따옴표 뒤에는 구분자·줄 끝·파일 끝만 올 수 있다
      if (i < n && text[i] !== ',' && !eol(i)) return { ok: false, error: { code: 'text_after_closing_quote', line } };
      continue;
    }
    if (ch === ',') {
      endField();
      i++;
      continue;
    }
    const e = eol(i);
    if (e) {
      endRecord();
      line++;
      recordLine = line;
      i += e;
      continue;
    }
    if (ch === '"') {
      // 따옴표로 시작하지 않은 칸 안의 따옴표(따옴표 칸은 위에서 끝까지 읽었으므로 여기 오지 않는다)
      if (!quoted) return { ok: false, error: { code: 'quote_in_unquoted_field', line } };
    }
    field += ch;
    atFieldStart = false;
    i++;
  }
  // 마지막 줄이 줄 끝 글자 없이 끝난 경우
  if (!atFieldStart || field !== '' || cells.length > 0 || anyQuoted) endRecord();
  return { ok: true, records };
}

/**
 * 원본 CSV 글자열을 엄격하게 읽는다.
 * - 따옴표·줄 경계 판정이 가장 먼저다. 구조 오류면 `ok: false`이고 그 뒤 단계는 돌지 않는다.
 * - 빈 줄은 건너뛴다(집계에 넣지 않음). 머리줄은 첫 번째 비어 있지 않은 줄이다.
 * - 열 수가 머리줄과 다른 줄은 그 줄만 `rowErrors`에 넣고 `rows`에서 뺀다(모자란 칸을 채우지 않는다).
 * - 데이터 행(열 수 오류 줄 포함)이 10,000개를 넘으면 파일 전체를 거절한다.
 */
export function readStrictCsv(text: string): StrictCsvResult {
  const scanned = scan(text);
  if (!scanned.ok) return scanned;
  const records = scanned.records.filter((r) => !r.blank);
  if (!records.length) return { ok: false, error: { code: 'no_header' } };
  const header = records[0].cells.map((h) => h.trim());
  if (header.every((h) => h === '')) return { ok: false, error: { code: 'no_header' } };
  const seen = new Set<string>();
  for (let c = 0; c < header.length; c++) {
    if (header[c] === '') return { ok: false, error: { code: 'empty_header_name', column: c + 1 } };
    if (seen.has(header[c])) return { ok: false, error: { code: 'duplicate_header', column: c + 1 } };
    seen.add(header[c]);
  }
  const data = records.slice(1);
  if (data.length > STRICT_CSV_MAX_ROWS) return { ok: false, error: { code: 'too_many_rows', limit: STRICT_CSV_MAX_ROWS } };
  const rows: StrictCsvRow[] = [];
  const rowErrors: StrictCsvRowError[] = [];
  for (const r of data) {
    if (r.cells.length !== header.length) rowErrors.push({ line: r.line, code: 'column_count', expected: header.length, got: r.cells.length });
    else rows.push({ line: r.line, cells: r.cells });
  }
  return { ok: true, header, rows, rowErrors };
}
