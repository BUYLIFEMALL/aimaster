// 엑셀 읽기·쓰기 — 기준: shop-order-report/src/lib/sheet.ts·exportSheet.ts(SheetJS 0.20.3 공식 배포판).
// 브라우저에서만 처리하고 파일을 서버로 보내지 않는다(발주서에 고객 정보가 있다).
import * as XLSX from "xlsx";

export type SheetRow = Record<string, string>;
export const ACCEPT_SHEETS = ".xlsx,.xls,.csv,.tsv,.txt";
const MAX_ROWS = 5000;

function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("euc-kr").decode(bytes);
  }
}

function toRows(aoa: unknown[][]): SheetRow[] {
  const rows = aoa.filter((r) => r.some((v) => String(v ?? "").trim() !== ""));
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h ?? "").trim());
  return rows.slice(1, MAX_ROWS + 1).map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? "").trim()])));
}

export function readSheet(bytes: Uint8Array, fileName: string): SheetRow[] {
  if (/\.(csv|tsv|txt)$/i.test(fileName)) {
    const lines = decodeText(bytes).replace(/\r\n?/g, "\n").split("\n");
    const sep = lines.some((l) => l.includes("\t")) ? "\t" : ",";
    return toRows(lines.map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, ""))));
  }
  const wb = XLSX.read(bytes, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return ws ? toRows(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" })) : [];
}

/** 표를 엑셀 파일로 저장한다(번호는 글자로 넣어 엑셀이 지수로 바꾸지 않게) */
export function saveWorkbook(fileName: string, sheetName: string, rows: string[][]): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName.slice(0, 31));
  const blob = new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
