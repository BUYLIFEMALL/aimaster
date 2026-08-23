import "server-only";
import * as XLSX from "xlsx";
import type { LeadStatus } from "@/types/database.types";

export interface ParsedLeadRow {
  channel: string | null;
  nickname: string | null; // 없으면 null(선택 항목, 필수 아님)
  email: string;
  status: LeadStatus;
  send_count: number; // 0 = 미발송, 1~5 = 몇 차까지 발송했는지
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
 * "상태" 한 컬럼(화면 배지와 동일한 문구: 미발송/N차 발송/발송제외/수신거부)을
 * status + send_count로 변환한다. 비어있거나 못 읽는 값은 미발송으로 간주한다.
 */
function mapStatusText(value: unknown): { status: LeadStatus; sendCount: number } {
  const text = cellToText(value) ?? "";
  if (text.includes("발송제외") || text.includes("고객완료")) return { status: "customer_completed", sendCount: 0 };
  if (text.includes("수신거부") || text.includes("스탑") || text.includes("중지")) return { status: "stopped", sendCount: 0 };
  const match = text.match(/^(\d)\s*차/);
  if (match) return { status: "new", sendCount: Math.min(5, Math.max(1, Number(match[1]))) };
  return { status: "new", sendCount: 0 };
}

export function parseLeadsWorkbook(buffer: Buffer): ParsedLeadRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const result: ParsedLeadRow[] = [];
  const seenEmails = new Set<string>();

  for (const row of rows) {
    const email = cellToText(row["이메일"])?.toLowerCase();
    if (!email || !email.includes("@")) continue; // 이메일 없는 행은 건너뜀
    if (seenEmails.has(email)) continue; // 같은 파일 안 중복 방지
    seenEmails.add(email);

    const { status, sendCount } = mapStatusText(row["상태"]);

    result.push({
      channel: cellToText(row["채널"]),
      nickname: cellToText(row["닉네임"]), // 닉네임 컬럼이 비어있으면 null(선택 항목)
      email,
      status,
      send_count: sendCount,
    });
  }

  return result;
}
