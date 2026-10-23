// 엑셀·CSV 읽기/쓰기(SheetJS 0.20.3 공식 배포판). 브라우저·Node 공용 — 서버로 보내지 않고 이 함수들만 쓴다.
import * as XLSX from "xlsx";
import { decodeText, type Encoding } from "./text";
import type { Cell } from "./table";

/** rowNums: aoa 각 행의 원본 엑셀 행 번호(0부터), col0: aoa 0번 열의 원본 열 번호(0부터) — 서식 유지 저장에서 원본 셀을 찾는 데 쓴다(v1.04) */
export interface RawSheet { name: string; aoa: Cell[][]; rowNums: number[]; col0: number }

export const isCsv = (name: string) => /\.(csv|tsv|txt)$/i.test(name);
export const ACCEPT_SHEETS = ".xlsx,.xls,.xlsm,.csv";

/** 파일 바이트 → 시트 목록. CSV는 문자 인코딩을 자동(또는 지정)으로 풀어서 읽는다 */
export function readSheets(bytes: Uint8Array, fileName: string, enc: Encoding = "auto"): RawSheet[] {
  const wb = isCsv(fileName)
    ? XLSX.read(decodeText(bytes, enc).text, { type: "string", cellDates: true, raw: false })
    : XLSX.read(bytes, { type: "array", cellDates: true, dense: true });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const start = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s : { r: 0, c: 0 };
    // 빈 줄까지 읽은 뒤 직접 걸러 원본 행 번호를 남긴다(값이 하나도 없는 행 = 빈 줄, 예전 blankrows:false와 같은 기준)
    const all = XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
    const aoa: Cell[][] = [], rowNums: number[] = [];
    all.forEach((r, i) => { if (r.some((v) => v !== null && v !== undefined)) { aoa.push(r); rowNums.push(start.r + i); } });
    return { name: isCsv(fileName) ? "" : name, aoa, rowNums, col0: start.c };
  });
}

/** 표 여러 개 → .xlsx 바이트 */
export function writeXlsx(sheets: { name: string; header: string[]; rows: Cell[][] }[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([s.header, ...s.rows], { cellDates: true, dateNF: "yyyy-mm-dd" });
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer);
}

/** 시트를 원본 모양 그대로(2차원 배열) 모아 .xlsx 바이트로 — "시트별로 모으기"·"시트별로 나누기"용 */
export function writeXlsxAoa(sheets: { name: string; aoa: Cell[][] }[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.aoa, { cellDates: true, dateNF: "yyyy-mm-dd" }), s.name);
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer);
}

/** 표 → CSV 바이트(엑셀에서 한글이 깨지지 않게 UTF-8 BOM 포함) */
export function writeCsv(header: string[], rows: Cell[][]): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows], { cellDates: true, dateNF: "yyyy-mm-dd" });
  const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
  return new TextEncoder().encode("﻿" + csv);
}
