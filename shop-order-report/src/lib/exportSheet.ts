// 리포트 표를 엑셀(.xlsx)로 — 브라우저에서 만들어 바로 저장한다.
import * as XLSX from "xlsx";

export function writeWorkbook(sheets: { name: string; rows: (string | number)[][] }[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31));
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}
