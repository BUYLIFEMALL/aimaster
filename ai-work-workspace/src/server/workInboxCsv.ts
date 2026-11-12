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
/** 받은 날: 한국 시간(UTC+9) 날짜 — 서버(UTC) 날짜를 그대로 쓰면 밤 9시 이후 하루 전 날짜가 됨 */
export function kstDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : iso.slice(0, 10);
}

export function inboxRowCsv(row: InboxCsvRow): string {
  const header = ["이름", "보낸 프로그램", "종류", "받은 날", "원본 링크"];
  const values: unknown[] = [row.title, row.source_slug, KIND_LABEL[row.kind] ?? row.kind, kstDate(row.created_at), row.source_url ?? ""];
  for (const [k, v] of Object.entries(row.data ?? {}).slice(0, 10)) {
    if (!k.trim() || header.includes(k)) continue;
    if (v == null || (typeof v === "object" && !Array.isArray(v))) continue;
    header.push(k.slice(0, 60));
    values.push(Array.isArray(v) ? v.join(", ") : v);
  }
  return `${header.map(csvCell).join(",")}\n${values.map(csvCell).join(",")}\n`;
}

export const KIND_LABEL: Record<string, string> = { note: "메모", task: "할 일", meeting: "회의", document: "문서", table: "표", link: "링크" };

// ---- U10 콘텐츠 캘린더 (2026-11-06) ----
// 발행 프로그램은 kind "document" + data { 채널, 상태, 예약일 | 발행일, "발행 주소" }로 보낸다(공용 표 종류를 늘리지 않음).
// 머리글은 템플릿 'content-calendar'(litpage/server/content/catalog.ts)의 열 이름과 같아야 한다.

/** 캘린더에 넣을 수 있는 항목: 채널과 날짜(발행일 또는 예약일)가 있어야 한다 */
export function isCalendarItem(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false;
  const hasDate = typeof data["발행일"] === "string" || typeof data["예약일"] === "string";
  return typeof data["채널"] === "string" && !!(data["채널"] as string).trim() && hasDate;
}

const CHANNELS = ["네이버 블로그", "블로그", "Threads", "인스타그램", "유튜브"];
const PROGRAM_LABEL: Record<string, string> = {
  "naver-blog-agent": "네이버 블로그 에이전트",
  "ai-auto-blog": "블로그 포스팅 자동화",
  "threads-content-ops": "Threads 콘텐츠 운영",
  "auto-instagram-posting": "INSTA 포스팅 자동화", // programs.slug(폴더 insta_auto_poster)
  "auto-shorts-posting": "YOUTUBE Shots 자동화", // programs.slug(폴더 shots) — 2026-11-12 U10 유튜브
  "shorts-onestop-studio": "AI 쇼츠 원스톱 제작 자동화",
  "playlist-channel-studio": "플레이리스트 채널 제작 자동화",
};

/** 보낸 쪽 상태 값(영어·한국어 섞임) → 캘린더 상태 선택지 */
export function calendarStatus(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (/^(published|발행|발행됨|발행 완료|완료)$/.test(s)) return "발행 완료";
  if (/^(scheduled|queued|예약|예약됨|reserved)$/.test(s)) return "예약됨";
  if (/^(failed|error|실패|오류)$/.test(s)) return "실패";
  return "초안";
}

/** 캘린더 표 행 CSV(머리글 + 1행): 제목 / 날짜 / 채널 / 상태 / 발행 주소 / 보낸 프로그램 / 원본 링크 / 메모 */
export function calendarRowCsv(row: InboxCsvRow & { body_md?: string | null }): string {
  const d = row.data ?? {};
  const date = (typeof d["발행일"] === "string" && d["발행일"]) || (typeof d["예약일"] === "string" && d["예약일"]) || kstDate(row.created_at);
  const channelRaw = String(d["채널"] ?? "").trim();
  const channel = CHANNELS.includes(channelRaw) ? channelRaw : "기타";
  const url = typeof d["발행 주소"] === "string" ? d["발행 주소"] : "";
  const memo = (row.body_md ?? "").split("\n").find((l) => l.trim())?.trim().slice(0, 200) ?? "";
  const header = ["제목", "날짜", "채널", "상태", "발행 주소", "보낸 프로그램", "원본 링크", "메모"];
  const values = [row.title, String(date).slice(0, 10), channel, calendarStatus(d["상태"]), url, PROGRAM_LABEL[row.source_slug] ?? row.source_slug, row.source_url ?? "", memo];
  return `${header.map(csvCell).join(",")}\n${values.map(csvCell).join(",")}\n`;
}

