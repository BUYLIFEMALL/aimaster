// 강의 일정 가져오기 — 오류 응답에 덧붙는 공개 칸의 허용 목록(순수 함수).
// 2026-11-20 WS-LECTURE-PREVIEW-ONLY(플랜 docs/PLAN_20261120_NOTION_LECTURE_IMPORT.md §19-2).
// 실행기(src/server/runtime.ts)가 모든 명령의 오류에 이 함수를 한 번 적용한다. 허용 목록 밖의 값은 던져져도 싣지 않는다 —
// 그래서 실수로 내부 사유·남의 정보가 응답으로 나가지 않는다. 500 이상에는 아무것도 싣지 않는다.
import { STRICT_CSV_MAX_ROWS } from './strictCsv.ts';

/** 공개 `code` — 4xx 여덟 가지뿐 */
export const PUBLIC_ERROR_CODES = new Set([
  'file_invalid',
  'too_many_rows',
  'preview_expired',
  'preview_invalid',
  'table_changed',
  'table_exists',
  'settings_missing',
  'table_too_large',
]);

/** `file_invalid`의 `detail.reason` 열 가지와, 함께 실릴 수 있는 칸 */
const FILE_REASONS: Record<string, 'line' | 'column' | null> = {
  unterminated_quote: 'line',
  text_after_closing_quote: 'line',
  quote_in_unquoted_field: 'line',
  no_header: null,
  empty_header_name: 'column',
  duplicate_header: 'column',
  zone_invalid: null,
  title_column_missing: null,
  date_column_missing: null,
  same_column: null,
};

const positiveInt = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 1;

export interface PublicErrorFields {
  code?: string;
  detail?: { reason: string; line?: number; column?: number };
  limit?: number;
}

/**
 * 던져진 오류의 선택 칸을 허용 목록으로 거른다. 결과는 응답 본문에 그대로 펼쳐 넣을 수 있는 객체다(빈 객체면 덧붙일 것 없음).
 * - 상태가 500 이상이거나 400 미만이면 빈 객체.
 * - `code`가 목록 밖이면 빈 객체(`detail`·`limit`도 함께 버린다).
 * - `file_invalid`: `detail.reason`이 열 가지 중 하나일 때만 `detail`을 싣고, `line`·`column`은 그 사유에 허용된 칸이 1 이상의 안전 정수일 때만.
 *   사유가 틀리면 `detail` 없이 `code`만. `limit`은 싣지 않는다.
 * - `too_many_rows`: `limit`이 정확히 10,000일 때만 `limit`. `detail`은 싣지 않는다.
 * - 나머지 여섯 코드: `code`만.
 */
export function publicErrorFields(status: number, extra: unknown): PublicErrorFields {
  if (!(status >= 400 && status < 500)) return {};
  if (!extra || typeof extra !== 'object') return {};
  const { code, detail, limit } = extra as { code?: unknown; detail?: unknown; limit?: unknown };
  if (typeof code !== 'string' || !PUBLIC_ERROR_CODES.has(code)) return {};
  if (code === 'file_invalid') {
    const d = detail as { reason?: unknown; line?: unknown; column?: unknown } | null | undefined;
    if (!d || typeof d !== 'object' || typeof d.reason !== 'string' || !Object.hasOwn(FILE_REASONS, d.reason)) return { code };
    const allowed = FILE_REASONS[d.reason];
    const out: { reason: string; line?: number; column?: number } = { reason: d.reason };
    if (allowed === 'line' && positiveInt(d.line)) out.line = d.line;
    if (allowed === 'column' && positiveInt(d.column)) out.column = d.column;
    return { code, detail: out };
  }
  if (code === 'too_many_rows') return limit === STRICT_CSV_MAX_ROWS ? { code, limit: STRICT_CSV_MAX_ROWS } : { code };
  return { code };
}
