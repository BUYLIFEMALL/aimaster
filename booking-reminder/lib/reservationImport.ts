import * as XLSX from "xlsx";

// 2026-10-23 v1.28 — 한국 시간 처리 + 예약 엑셀 일괄 등록(순수 함수: 서버 액션·시험에서 함께 씀).

/**
 * 「2026-10-25 14:00」 같은 시각을 **한국 시간(KST, UTC+9)** 으로 읽어 ISO 문자열로 바꾼다.
 * 서버(Vercel)는 UTC라 `new Date("2026-10-25T14:00")`를 그대로 쓰면 14:00 UTC(한국 23:00)로 저장돼
 * 리마인드가 9시간 늦게 나가던 버그가 있었다(v1.27까지). 시간대 표시(Z·+09:00)가 붙어 있으면 그대로 따른다.
 */
export function parseKstDateTime(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const d = new Date(text);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T]+(?:(오전|오후)\s*)?(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, y, mo, d, ampm, hh, mi, ss] = m;
  let hour = hh ? Number(hh) : 0;
  if (ampm === "오후" && hour < 12) hour += 12;
  if (ampm === "오전" && hour === 12) hour = 0;
  return wallClockKstToIso(Number(y), Number(mo), Number(d), hour, mi ? Number(mi) : 0, ss ? Number(ss) : 0);
}

function wallClockKstToIso(y: number, mo: number, d: number, h: number, mi: number, s: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const ms = Date.UTC(y, mo - 1, d, h - 9, mi, s);
  const check = new Date(ms + 9 * 3600 * 1000); // 2월 30일 같은 없는 날짜 거르기
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return new Date(ms).toISOString();
}

/** 엑셀 셀(날짜 일련번호·문자열)을 한국 시간 ISO로. 일련번호는 표시된 벽시계 시각 그대로 한국 시간으로 본다. */
export function excelCellToKstIso(value: unknown): string | null {
  if (typeof value === "number" && isFinite(value)) {
    const p = XLSX.SSF.parse_date_code(value);
    if (!p || !p.y) return null;
    return wallClockKstToIso(p.y, p.m, p.d, p.H, p.M, Math.round(p.S));
  }
  if (typeof value === "string") return parseKstDateTime(value);
  return null;
}

/** 핸드폰 번호를 010-1234-5678 형식으로. 핸드폰이 아니면 null (Step Mail lib/sms.ts와 같은 규칙). */
export function normalizeMobile(value: unknown): string | null {
  if (value == null) return null;
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("82")) digits = "0" + digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits; // 엑셀이 앞의 0을 지운 경우
  if (!/^01[016789]\d{7,8}$/.test(digits)) return null;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const IMPORT_HEADERS = ["고객명", "핸드폰", "이메일", "예약일시", "메모"] as const;
export const MAX_IMPORT_ROWS = 500;

export interface ParsedReservation {
  row: number; // 엑셀 행 번호(머리글 = 1)
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  reservation_at: string; // ISO
  memo: string | null;
}

export interface SkippedRow {
  row: number;
  reason: string;
}

function cellText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

/**
 * 첫 시트를 읽어 등록할 예약과 건너뛸 행(사유)을 나눈다. DB를 보지 않으므로 「이미 등록된 예약」 중복은
 * 서버 액션에서 따로 거른다. now 이전 예약일시는 등록 즉시 리마인드가 나가지 않도록 건너뛴다.
 */
export function parseReservationWorkbook(buffer: Buffer | Uint8Array, now = Date.now()): { rows: ParsedReservation[]; skipped: SkippedRow[]; tooMany: boolean } {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
  if (!sheet) return { rows: [], skipped: [], tooMany: false };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  const tooMany = raw.length > MAX_IMPORT_ROWS;
  const rows: ParsedReservation[] = [];
  const skipped: SkippedRow[] = [];
  const seen = new Set<string>();

  raw.slice(0, MAX_IMPORT_ROWS).forEach((r, i) => {
    const row = i + 2;
    const name = cellText(r["고객명"]);
    const rawPhone = cellText(r["핸드폰"] ?? r["전화번호"] ?? r["연락처"] ?? r["휴대폰"]);
    const phone = normalizeMobile(rawPhone);
    const email = cellText(r["이메일"])?.toLowerCase() ?? null;
    const at = excelCellToKstIso(r["예약일시"]);
    if (!name && !rawPhone && !email && r["예약일시"] == null) return; // 빈 줄
    if (!name) return void skipped.push({ row, reason: "고객명 없음" });
    if (!at) return void skipped.push({ row, reason: "예약일시를 읽지 못함(예: 2026-10-25 14:00)" });
    if (Date.parse(at) <= now) return void skipped.push({ row, reason: "이미 지난 예약일시" });
    if (rawPhone && !phone && !email) return void skipped.push({ row, reason: "핸드폰 번호 형식이 아님" });
    if (!phone && !(email && email.includes("@"))) return void skipped.push({ row, reason: "핸드폰·이메일 둘 다 없음" });
    const key = `${name}|${phone ?? email}|${at}`;
    if (seen.has(key)) return void skipped.push({ row, reason: "파일 안 중복" });
    seen.add(key);
    rows.push({ row, customer_name: name, customer_phone: phone, customer_email: email && email.includes("@") ? email : null, reservation_at: at, memo: cellText(r["메모"]) });
  });
  return { rows, skipped, tooMany };
}
