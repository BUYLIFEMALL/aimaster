import "server-only";
import * as XLSX from "xlsx";

export interface ParsedRecipientRow {
  phone: string;
  label: string | null;
}

function cellToText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number") return String(value);
  return null;
}

/**
 * 엑셀(xlsx) 업로드로 수신자를 대량 등록할 때 쓰는 파서. 컬럼 이름으로 읽기 때문에
 * "이름"/"전화번호" 순서가 바뀌어도 정상 동작한다 — stepmail의 lib/leads.ts와 동일한 패턴.
 */
export function parseBroadcastRecipientsWorkbook(buffer: Buffer): ParsedRecipientRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const result: ParsedRecipientRow[] = [];
  const seenPhones = new Set<string>();

  for (const row of rows) {
    const phone = (cellToText(row["전화번호"]) ?? "").replace(/[^0-9]/g, "");
    if (!/^0\d{9,10}$/.test(phone)) continue; // 형식이 안 맞는 행은 건너뜀
    if (seenPhones.has(phone)) continue; // 같은 파일 안 중복 방지
    seenPhones.add(phone);

    result.push({ phone, label: cellToText(row["이름"]) });
  }

  return result;
}
