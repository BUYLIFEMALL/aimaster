// 사본 — 기준 music/lib/remixVariantInsert.ts (2026-11-20 리믹스 가사 1차, 공용 등록은 Master 조정 뒤). 이 파일을 직접 고치지 말고 기준을 고친 뒤 복사한다.
// 리믹스 가사 1차 — 새 변주 저장의 구형 스키마 호환 판정(PHASE1-COMPAT-MOCK A2·A3, 2026-11-20 Master msg_588297d118e7·msg_cfe322ab3108).
// 순수 모듈: Supabase를 직접 부르지 않고 넘겨받은 insert 함수만 쓴다. 아직 어디에도 연결하지 않는다(remixSync·콜백 변경 없음).
// 설계: docs/PLAN_20261120_REMIX_LYRICS_PERSISTENCE.md 부록 PHASE1-COMPAT-MOCK, 표본 docs/fixtures/remix-lyrics-compat-mock-20261120.json.

export const REMIX_LYRICS_COLUMNS = ["suno_task_id", "lyrics", "lyrics_status"] as const;
export const REMIX_VARIANTS_TABLE = "music_track_remix_variants";

export interface DbErrorLike {
  code?: string | number | null;
  message?: string | null;
  details?: string | null;
}

/** 오류 문구에서 뽑은 칸·표(원문은 보관하지 않음) */
export interface MissingColumnInfo {
  code: "42703" | "PGRST204";
  column: string;
  table: string | null;
}

// 형식(이 셋만 인정, 그 밖 자유 문구는 판정 불가):
//  42703 ① column "<칸>" of relation "<표>" does not exist  ② column "<칸>" does not exist  ③ column <표>.<칸> does not exist
//  PGRST204  Could not find the '<칸>' column of '<표>' in the schema cache
const PG_QUOTED = /^column "([^"]+)"(?: of relation "([^"]+)")? does not exist$/;
const PG_DOTTED = /^column ([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*) does not exist$/;
const PGRST = /^Could not find the '([^']+)' column of '([^']+)' in the schema cache$/;

function parseOne(code: string, text: string): MissingColumnInfo | null {
  const s = text.trim();
  if (code === "42703") {
    let m = PG_QUOTED.exec(s);
    if (m) return { code, column: m[1], table: m[2] ?? null };
    m = PG_DOTTED.exec(s);
    if (m) return { code, column: m[2], table: m[1] };
    return null;
  }
  if (code === "PGRST204") {
    const m = PGRST.exec(s);
    if (m) return { code, column: m[1], table: m[2] };
  }
  return null;
}

function sameInfo(a: MissingColumnInfo, b: MissingColumnInfo): boolean {
  return a.column === b.column && (a.table === null || b.table === null || a.table === b.table);
}

/**
 * 「칸 없음」 오류의 칸·표를 형식대로만 뽑는다. message·details를 **둘 다** 해석해,
 * 해석된 근거가 서로 다르면(칸이 다르거나 둘 다 적힌 표가 다르면) 판정 불가(null) — 재시도하지 않게 한다.
 */
export function parseMissingColumnError(err: DbErrorLike | null | undefined): MissingColumnInfo | null {
  if (!err) return null;
  const code = String(err.code ?? "");
  if (code !== "42703" && code !== "PGRST204") return null;
  const hits: MissingColumnInfo[] = [];
  for (const text of [err.message, err.details]) {
    if (typeof text === "string" && text) {
      const hit = parseOne(code, text);
      if (hit) hits.push(hit);
    }
  }
  if (!hits.length) return null;
  if (hits.length === 2 && !sameInfo(hits[0], hits[1])) return null;
  const table = hits.find((h) => h.table !== null)?.table ?? null;
  return { code: hits[0].code, column: hits[0].column, table };
}

/** 이번 새 3칸 중 하나가 없어서 난 오류인지 — 칸 이름 전체 일치, 표 이름이 있으면 변주 표와 일치 */
export function isMissingLyricsColumnError(err: DbErrorLike | null | undefined): boolean {
  const info = parseMissingColumnError(err);
  if (!info) return false;
  if (!(REMIX_LYRICS_COLUMNS as readonly string[]).includes(info.column)) return false;
  if (info.table !== null && info.table !== REMIX_VARIANTS_TABLE && info.table !== `public.${REMIX_VARIANTS_TABLE}`) return false;
  return true;
}

/** 새 3칸만 뺀 복사본(행 수·순서·나머지 칸 그대로) */
export function stripLyricsColumns<T extends Record<string, unknown>>(rows: T[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    for (const k of REMIX_LYRICS_COLUMNS) delete copy[k];
    return copy;
  });
}

/**
 * insert 응답. Supabase JS(PostgREST 클라이언트)는 연결이 끊기면 예외 대신 `status: 0`과 빈 code를 돌려준다.
 * `status === 0` 또는 어댑터가 붙인 `transportLost: true`만 「전송 결과 불확실」로 본다(빈 code만으로는 추정하지 않음).
 */
export interface InsertResponse {
  error: DbErrorLike | null;
  status?: number;
  transportLost?: boolean;
}

export type InsertFn = (rows: Record<string, unknown>[]) => Promise<InsertResponse>;

export type InsertOutcome =
  | "ok" // 첫 insert 성공
  | "ok_without_lyrics_columns" // 구형 DB — 3칸 뺀 재시도 성공
  | "error" // 첫 insert 오류(재시도 대상 아님)
  | "uncertain" // 첫 insert 전송 결과 불확실(예외·status 0·transportLost) — 이미 저장됐을 수 있음
  | "retry_failed" // 재시도도 오류
  | "retry_uncertain" // 재시도 전송 결과 불확실
  | "skipped"; // 저장할 행 0개

/** 결과에 담는 오류 코드 — 이 목록 밖은 "other", 없으면 "none" */
export const KNOWN_ERROR_CODES = ["42703", "PGRST204", "42501", "23505", "42P01"] as const;
export type ErrorCodeLabel = (typeof KNOWN_ERROR_CODES)[number] | "other" | "none";

export interface InsertResult {
  outcome: InsertOutcome;
  calls: number;
  /** 원문(message·details)·행 값은 담지 않는다. 칸은 이번 3칸일 때만, 표는 변주 표일 때만, 그 밖은 null */
  error: { code: ErrorCodeLabel; column: (typeof REMIX_LYRICS_COLUMNS)[number] | null; table: typeof REMIX_VARIANTS_TABLE | null } | null;
}

function summarize(err: DbErrorLike | null | undefined): InsertResult["error"] {
  if (!err) return null;
  const raw = String(err.code ?? "");
  const code: ErrorCodeLabel = !raw ? "none" : (KNOWN_ERROR_CODES as readonly string[]).includes(raw) ? (raw as ErrorCodeLabel) : "other";
  const info = parseMissingColumnError(err);
  const column = info && (REMIX_LYRICS_COLUMNS as readonly string[]).includes(info.column) ? (info.column as (typeof REMIX_LYRICS_COLUMNS)[number]) : null;
  const table = info && (info.table === REMIX_VARIANTS_TABLE || info.table === `public.${REMIX_VARIANTS_TABLE}`) ? REMIX_VARIANTS_TABLE : null;
  return { code, column, table };
}

function transportUncertain(res: InsertResponse | null | undefined): boolean {
  return !res || res.status === 0 || res.transportLost === true;
}

/**
 * 변주 행 저장 — 첫 insert가 이번 새 3칸 「칸 없음」(형식·칸·표 확인, message·details 근거 일치)일 때만 3칸을 뺀 같은 행으로 **한 번** 다시.
 * 그 밖 오류·권한·전송 결과 불확실·첫 성공은 다시 하지 않는다. 최대 insert 2회.
 */
export async function insertRemixVariantsWithFallback(insert: InsertFn, rows: Record<string, unknown>[]): Promise<InsertResult> {
  if (!rows.length) return { outcome: "skipped", calls: 0, error: null };
  let first: InsertResponse;
  try {
    first = await insert(rows);
  } catch {
    return { outcome: "uncertain", calls: 1, error: null };
  }
  if (transportUncertain(first)) return { outcome: "uncertain", calls: 1, error: null };
  if (!first.error) return { outcome: "ok", calls: 1, error: null };
  if (!isMissingLyricsColumnError(first.error)) return { outcome: "error", calls: 1, error: summarize(first.error) };

  let second: InsertResponse;
  try {
    second = await insert(stripLyricsColumns(rows));
  } catch {
    return { outcome: "retry_uncertain", calls: 2, error: summarize(first.error) };
  }
  if (transportUncertain(second)) return { outcome: "retry_uncertain", calls: 2, error: summarize(first.error) };
  if (!second.error) return { outcome: "ok_without_lyrics_columns", calls: 2, error: null };
  return { outcome: "retry_failed", calls: 2, error: summarize(second.error) };
}
