// 라벨 채우기용 표 읽기 — 엑셀(.xlsx·.xls)·CSV 파일, 또는 엑셀에서 복사해 붙여 넣은 글(탭 구분).
// 첫 줄을 열 이름으로 쓴다. 파일은 서버로 보내지 않는다(SheetJS 0.20.3 공식 배포판, file-merge와 같은 버전).
import * as XLSX from "xlsx";

export interface SheetData {
  headers: string[];
  rows: Record<string, string>[];
}

export const ACCEPT_SHEETS = ".xlsx,.xls,.csv,.tsv,.txt";
const MAX_ROWS = 5000;

/** CSV 바이트를 글자로 — UTF-8이 아니면 한국 엑셀 기본(EUC-KR)으로 다시 읽는다. */
export function decodeCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("euc-kr").decode(bytes);
  }
}

/** 2차원 배열(첫 줄 = 열 이름) → 표. 빈 열 이름은 「열1」처럼 붙이고, 같은 이름은 뒤에 번호를 붙인다. */
export function aoaToSheet(aoa: unknown[][]): SheetData {
  const rows = aoa.filter((r) => r.some((v) => v !== null && v !== undefined && String(v).trim() !== ""));
  if (!rows.length) return { headers: [], rows: [] };
  const seen = new Map<string, number>();
  const headers = rows[0].map((h, i) => {
    let name = String(h ?? "").trim() || `열${i + 1}`;
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    if (n > 0) name = `${name}${n + 1}`;
    return name;
  });
  const body = rows.slice(1, MAX_ROWS + 1).map((r) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      const v = r[i];
      rec[h] = v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim();
    });
    return rec;
  });
  return { headers, rows: body };
}

export function parsePasted(text: string): SheetData {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const sep = lines.some((l) => l.includes("\t")) ? "\t" : ",";
  return aoaToSheet(lines.map((l) => l.split(sep)));
}

export function readSheetBytes(bytes: Uint8Array, fileName: string): SheetData {
  const isText = /\.(csv|tsv|txt)$/i.test(fileName);
  if (isText) return parsePasted(decodeCsv(bytes));
  const wb = XLSX.read(bytes, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { headers: [], rows: [] };
  return aoaToSheet(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" }));
}

/** 예시 표(.xlsx) — 회원이 내려받아 채워 쓴다. */
export function sampleWorkbook(headers: string[], example: string[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...example]), "라벨");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}
