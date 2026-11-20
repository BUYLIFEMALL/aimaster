// 리믹스 가사 1차 — 새 변주 저장의 구형 스키마 호환 판정(PHASE1-COMPAT-MOCK A2, 2026-11-20 Master msg_588297d118e7).
// 순수 모듈: Supabase를 직접 부르지 않고 넘겨받은 insert 함수만 쓴다. 아직 어디에도 연결하지 않는다(remixSync·콜백 변경 없음).
// 설계: docs/PLAN_20261120_REMIX_LYRICS_PERSISTENCE.md 부록 PHASE1-COMPAT-MOCK, 표본 docs/fixtures/remix-lyrics-compat-mock-20261120.json.

export const REMIX_LYRICS_COLUMNS = ["suno_task_id", "lyrics", "lyrics_status"] as const;
export const REMIX_VARIANTS_TABLE = "music_track_remix_variants";

export interface DbErrorLike {
  code?: string | null;
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

/** 「칸 없음」 오류의 칸·표를 형식대로만 뽑는다. message 먼저, 없으면 details. 형식이 다르면 null. */
export function parseMissingColumnError(err: DbErrorLike | null | undefined): MissingColumnInfo | null {
  if (!err) return null;
  const code = String(err.code ?? "");
  if (code !== "42703" && code !== "PGRST204") return null;
  for (const text of [err.message, err.details]) {
    if (typeof text === "string" && text) {
      const hit = parseOne(code, text);
      if (hit) return hit;
    }
  }
  return null;
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

export type InsertFn = (rows: Record<string, unknown>[]) => Promise<{ error: DbErrorLike | null }>;

export type InsertOutcome =
  | "ok" // 첫 insert 성공
  | "ok_without_lyrics_columns" // 구형 DB — 3칸 뺀 재시도 성공
  | "error" // 첫 insert 오류(재시도 대상 아님)
  | "uncertain" // 첫 insert 응답 없음(이미 저장됐을 수 있음)
  | "retry_failed" // 재시도도 오류
  | "retry_uncertain" // 재시도 응답 없음
  | "skipped"; // 저장할 행 0개

export interface InsertResult {
  outcome: InsertOutcome;
  calls: number;
  /** 원문(message·details)은 담지 않는다 — 코드와 뽑은 칸·표만 */
  error: { code: string; column: string | null; table: string | null } | null;
}

function summarize(err: DbErrorLike | null | undefined): InsertResult["error"] {
  if (!err) return null;
  const info = parseMissingColumnError(err);
  return { code: String(err.code ?? ""), column: info?.column ?? null, table: info?.table ?? null };
}

/**
 * 변주 행 저장 — 첫 insert가 이번 새 3칸 「칸 없음」(형식·칸·표 확인)일 때만 3칸을 뺀 같은 행으로 **한 번** 다시.
 * 그 밖 오류·권한·응답 없음(결과 불확실)·첫 성공은 다시 하지 않는다. 최대 insert 2회.
 */
export async function insertRemixVariantsWithFallback(insert: InsertFn, rows: Record<string, unknown>[]): Promise<InsertResult> {
  if (!rows.length) return { outcome: "skipped", calls: 0, error: null };
  let first: { error: DbErrorLike | null };
  try {
    first = await insert(rows);
  } catch {
    return { outcome: "uncertain", calls: 1, error: null };
  }
  if (!first.error) return { outcome: "ok", calls: 1, error: null };
  if (!isMissingLyricsColumnError(first.error)) return { outcome: "error", calls: 1, error: summarize(first.error) };

  let second: { error: DbErrorLike | null };
  try {
    second = await insert(stripLyricsColumns(rows));
  } catch {
    return { outcome: "retry_uncertain", calls: 2, error: summarize(first.error) };
  }
  if (!second.error) return { outcome: "ok_without_lyrics_columns", calls: 2, error: null };
  return { outcome: "retry_failed", calls: 2, error: summarize(second.error) };
}
