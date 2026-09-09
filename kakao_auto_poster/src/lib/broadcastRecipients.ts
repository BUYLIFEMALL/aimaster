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
 * 전화번호 맨 앞 0을 되살린다. 엑셀 셀 서식이 "일반"(숫자)이면 "01012345678"을 입력해도
 * 숫자로 인식해 앞자리 0을 지워버려("1012345678") 저장한다 — 템플릿에서 텍스트 서식을
 * 지정해도 사용자가 서식을 바꾸거나 다른 프로그램에서 편집하면 재발할 수 있어서, 파싱
 * 단계에서 항상 복구하도록 한다. 텍스트로 이미 "0"이 붙어 있으면 그대로 통과시킨다.
 */
export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (/^0\d{9,10}$/.test(digits)) return digits;
  if (/^\d{9,10}$/.test(digits)) {
    const withZero = `0${digits}`;
    if (/^0\d{9,10}$/.test(withZero)) return withZero;
  }
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
    const phone = normalizePhone(cellToText(row["전화번호"]));
    if (!phone) continue; // 형식이 안 맞는 행은 건너뜀
    if (seenPhones.has(phone)) continue; // 같은 파일 안 중복 방지
    seenPhones.add(phone);

    result.push({ phone, label: cellToText(row["이름"]) });
  }

  return result;
}
