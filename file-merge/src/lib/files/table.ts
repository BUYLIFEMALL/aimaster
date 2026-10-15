// 표 데이터(엑셀 시트·CSV) 합치기·나누기 — 순수 함수(브라우저·Node 공용, 테스트 대상). 파일 입출력은 sheetio.ts.

export type Cell = string | number | boolean | Date | null;
export interface Table {
  /** 원본 파일 이름 */
  file: string;
  /** 원본 시트 이름(CSV는 빈 문자열) */
  sheet: string;
  header: string[];
  rows: Cell[][];
}

/** 시트 한 장의 2차원 배열을 머리글 행 기준 표로 바꾼다. headerRow는 1부터, 0이면 머리글 없음(열1·열2…) */
export function toTable(file: string, sheet: string, aoa: Cell[][], headerRow = 1): Table {
  // Math.max(...행 목록)은 행이 수만 개를 넘으면 호출 스택이 넘친다(특히 Worker) — 반복문으로 구한다(v1.02)
  let width = 0;
  for (const r of aoa) if (r.length > width) width = r.length;
  const hi = headerRow - 1;
  const raw = headerRow > 0 && aoa[hi] ? aoa[hi] : [];
  const header = uniqueHeaders(Array.from({ length: width }, (_, c) => raw[c]));
  const body = aoa.slice(headerRow > 0 ? hi + 1 : 0).filter((r) => r.some((v) => v !== null && v !== undefined && String(v).trim() !== ""));
  return { file, sheet, header, rows: body.map((r) => Array.from({ length: width }, (_, c) => norm(r[c]))) };
}

function norm(v: unknown): Cell {
  if (v === undefined || v === null) return null;
  if (typeof v === "number" || typeof v === "boolean" || v instanceof Date) return v;
  return String(v);
}

/** 머리글 정리: 앞뒤 공백 제거, 빈 칸은 "열N", 같은 이름은 " (2)"처럼 번호를 붙인다 */
export function uniqueHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((v, i) => {
    const base = v === null || v === undefined || String(v).trim() === "" ? `열${i + 1}` : String(v).trim();
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

/** 비교용 머리글 키: 대소문자·공백 차이를 무시한다("매출 " = "매출", "Name" = "name") */
export const headerKey = (h: string) => h.replace(/\s+/g, "").toLowerCase();

export const SOURCE_FILE = "원본 파일";
export const SOURCE_SHEET = "원본 시트";

/**
 * 머리글 이름 기준으로 이어 붙인다. 열 순서가 달라도 같은 이름의 열에 값이 들어가고, 처음 나온 순서로 열을 만든다.
 * 다른 파일에 없는 열은 빈칸. addSource면 맨 앞에 원본 파일·시트 열을 붙인다.
 */
export function mergeByHeader(tables: Table[], o: { addSource?: boolean } = {}): { header: string[]; rows: Cell[][] } {
  const order: string[] = [];
  const label = new Map<string, string>();
  for (const t of tables) for (const h of t.header) {
    const k = headerKey(h);
    if (!label.has(k)) { label.set(k, h); order.push(k); }
  }
  const rows: Cell[][] = [];
  for (const t of tables) {
    const pos = t.header.map((h) => order.indexOf(headerKey(h)));
    for (const r of t.rows) {
      const out: Cell[] = Array.from({ length: order.length }, () => null);
      r.forEach((v, c) => { if (pos[c] >= 0 && out[pos[c]] === null) out[pos[c]] = v; });
      rows.push(o.addSource ? [t.file, t.sheet, ...out] : out);
    }
  }
  const header = order.map((k) => label.get(k) as string);
  return { header: o.addSource ? [SOURCE_FILE, SOURCE_SHEET, ...header] : header, rows };
}

/** 열 값별로 나눈다(나온 순서 유지). 빈 값은 "(빈 값)" 묶음 */
export function splitByColumn(t: { header: string[]; rows: Cell[][] }, col: number): { key: string; rows: Cell[][] }[] {
  const groups = new Map<string, Cell[][]>();
  for (const r of t.rows) {
    const v = r[col];
    const key = v === null || String(v).trim() === "" ? "(빈 값)" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim();
    if (!groups.has(key)) groups.set(key, []);
    (groups.get(key) as Cell[][]).push(r);
  }
  return [...groups].map(([key, rows]) => ({ key, rows }));
}

/** n행씩 나눈다(머리글은 각 조각에 다시 넣는 쪽에서 처리) */
export function splitByRows<T>(rows: T[], n: number): T[][] {
  const size = Math.max(1, Math.floor(n));
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

const BAD_SHEET = /[\\/?*[\]:]/g;
/** 엑셀 시트 이름: 금지 문자 제거, 31자 이내, 이미 쓴 이름이면 "_2" 등을 붙인다(used에 추가) */
export function safeSheetName(name: string, used: Set<string>): string {
  const base = (name.replace(BAD_SHEET, "_").replace(/^'+|'+$/g, "").trim() || "Sheet").slice(0, 31);
  let out = base;
  for (let i = 2; used.has(out.toLowerCase()); i++) {
    const suf = `_${i}`;
    out = base.slice(0, 31 - suf.length) + suf;
  }
  used.add(out.toLowerCase());
  return out;
}

const BAD_FILE = /[\\/:*?"<>|\u0000-\u001f]/g;
/** 파일 이름에 쓸 수 없는 문자를 바꾸고 길이를 줄인다. 같은 이름이면 "(2)"를 붙인다(used에 추가) */
export function safeFileName(name: string, used?: Set<string>): string {
  const base = (name.replace(BAD_FILE, "_").replace(/\s+/g, " ").trim() || "파일").slice(0, 80);
  if (!used) return base;
  let out = base;
  for (let i = 2; used.has(out.toLowerCase()); i++) out = `${base} (${i})`;
  used.add(out.toLowerCase());
  return out;
}

/** 확장자를 뗀 파일 이름 */
export const stem = (name: string) => name.replace(/\.[^./\\]+$/, "");

/** 결과 열 고르기·순서 바꾸기(v1.03). cols는 남길 머리글 이름을 원하는 순서대로. null이면 그대로 */
export function pickColumns(m: { header: string[]; rows: Cell[][] }, cols: string[] | null): { header: string[]; rows: Cell[][] } {
  if (!cols) return m;
  const idx = cols.map((c) => m.header.indexOf(c)).filter((i) => i >= 0);
  return { header: idx.map((i) => m.header[i]), rows: m.rows.map((r) => idx.map((i) => r[i] ?? null)) };
}

const cellKey = (v: Cell) => (v === null ? "" : v instanceof Date ? v.toISOString() : typeof v === "string" ? v.trim() : String(v));

/**
 * 같은 행 제거(v1.03): 비교할 열(ignore에 든 열 제외)의 값이 모두 같으면 처음 나온 행만 남긴다.
 * 원본 파일·시트 열은 파일마다 달라 비교에서 뺀다. 글자 앞뒤 공백은 무시한다.
 */
export function dedupeRows(m: { header: string[]; rows: Cell[][] }, ignore: string[] = [SOURCE_FILE, SOURCE_SHEET]): { header: string[]; rows: Cell[][]; removed: number } {
  const use = m.header.map((h, i) => (ignore.includes(h) ? -1 : i)).filter((i) => i >= 0);
  const seen = new Set<string>();
  const rows: Cell[][] = [];
  for (const r of m.rows) {
    const k = JSON.stringify(use.map((i) => cellKey(r[i] ?? null)));
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push(r);
  }
  return { header: m.header, rows, removed: m.rows.length - rows.length };
}
