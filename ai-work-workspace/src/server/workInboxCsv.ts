// U7 업무 받은편지함: 표 행 CSV 만들기(DB 연결 없는 순수 함수 — 시험에서 바로 불러 씀)
export interface InboxCsvRow {
  title: string;
  source_slug: string;
  kind: string;
  created_at: string;
  source_url: string | null;
  data: Record<string, unknown>;
}

/** CSV 칸 하나(따옴표·줄바꿈 이스케이프) */
function csvCell(v: unknown): string {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 표 행 머리글·값: 이름 / 보낸 프로그램 / 종류 / 받은 날 / 원본 링크 + data의 단순 값(최대 10개) */
export function inboxRowCsv(row: InboxCsvRow): string {
  const header = ["이름", "보낸 프로그램", "종류", "받은 날", "원본 링크"];
  const values: unknown[] = [row.title, row.source_slug, KIND_LABEL[row.kind] ?? row.kind, row.created_at.slice(0, 10), row.source_url ?? ""];
  for (const [k, v] of Object.entries(row.data ?? {}).slice(0, 10)) {
    if (!k.trim() || header.includes(k)) continue;
    if (v == null || (typeof v === "object" && !Array.isArray(v))) continue;
    header.push(k.slice(0, 60));
    values.push(Array.isArray(v) ? v.join(", ") : v);
  }
  return `${header.map(csvCell).join(",")}\n${values.map(csvCell).join(",")}\n`;
}

export const KIND_LABEL: Record<string, string> = { note: "메모", task: "할 일", meeting: "회의", document: "문서", table: "표", link: "링크" };

