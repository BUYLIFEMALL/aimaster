import "server-only";
import * as XLSX from "xlsx";
import type { LeadStatus } from "@/types/database.types";

export interface ParsedLeadRow {
  channel: string | null;
  nickname: string | null; // 없으면 null(선택 항목, 필수 아님)
  email: string;
  memo: string | null;
  status: LeadStatus;
  send_count: number; // 0 = 미발송, 1~10 = 몇 차까지 발송했는지
  last_sent_at: string | null; // ISO timestamp
}

/**
 * 원본 잠재고객(T).xlsx 실데이터를 확인해보니(2026-08-17) "마지막 콜드메일 발송일" 셀이
 * 날짜형과 "2025.03.24" 같은 문자열이 섞여 있었다 — 둘 다 처리한다. (엑셀의 "입력일" 컬럼은
 * 시간 정보가 없어 더 이상 쓰지 않는다 — stepmail_leads.input_date는 실제로 이 리드가 우리
 * DB에 등록/갱신된 시점(가져오기 실행 시각)을 담도록 lib/actions/leads.ts에서 채운다.)
 */
function parseDateCell(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const m = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
    if (m) {
      const [, y, mo, d] = m;
      // new Date(y, mo, d)는 서버의 로컬 타임존으로 자정을 만들기 때문에(로컬 실행 시 KST라면
      // toISOString() 변환에서 하루가 밀린다), 타임존과 무관하게 UTC 자정으로 고정한다.
      return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
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
 * 원본 시트의 "현재Funnel"+"콜드메일차수" 두 컬럼을 status + send_count(몇 차까지 발송했는지,
 * 1~5)로 합친다. "콜드메일차수" 값이 "1차"~"5차" 형태면 그 숫자를 그대로 쓰고, 못 읽거나
 * 범위를 넘으면 1차로 간주한다.
 */
function mapFunnelToStatus(funnel: unknown, stage: unknown): { status: LeadStatus; sendCount: number } {
  const f = cellToText(funnel) ?? "";
  const s = cellToText(stage) ?? "";
  if (f === "고객완료") return { status: "customer_completed", sendCount: 0 };
  if (f === "스탑메일") return { status: "stopped", sendCount: 0 };
  if (f === "콜드메일") {
    const match = s.match(/^(\d)\s*차/);
    const sendCount = match ? Math.min(5, Math.max(1, Number(match[1]))) : 1;
    return { status: "new", sendCount };
  }
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

    const lastSentDate = parseDateCell(row["마지막 콜드메일 발송일"]);
    const { status, sendCount } = mapFunnelToStatus(row["현재Funnel"], row["콜드메일차수"]);

    result.push({
      channel: cellToText(row["채널"]),
      nickname: cellToText(row["닉네임"]), // 닉네임 컬럼이 비어있으면 null(선택 항목)
      email,
      memo: cellToText(row["메모"]),
      status,
      send_count: sendCount,
      last_sent_at: sendCount > 0 && lastSentDate ? lastSentDate.toISOString() : null,
    });
  }

  return result;
}
