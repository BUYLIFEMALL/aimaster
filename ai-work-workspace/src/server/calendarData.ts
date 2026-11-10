// 구글 캘린더 연동(2026-11-11) 공통 — 날짜 칸이 있는 표 찾기, 표 행 → 일정, ICS 글자 만들기. 플랜 docs/PLAN_20261111_GOOGLE_CALENDAR.md
import "server-only";
import { db, getRecord } from "@/litpage/server/db.ts";
import type { BlockRecord, CollectionRecord } from "#shared/records.ts";
import { memberSpaceIds, memberSpace, pageUrl } from "./workInbox";

export const APP_ORIGIN = "https://ai-work-workspace.buylife.xyz";
const DATE_NAME = /마감|예정|기한|날짜|일정|발행|예약|due|date/i;

export interface DateDb { id: string; title: string; dateProps: { id: string; name: string }[] }
export interface CalEvent { rowId: string; dbTitle: string; title: string; startDate: string; startTime?: string; endDate?: string; endTime?: string; url: string; memo?: string }

type RichText = [string, unknown[][]?][];
const oneLine = (rt: unknown): string => (Array.isArray(rt) ? (rt as RichText).map((s) => s?.[0] ?? "").join("") : "").replace(/\s+/g, " ").trim();

function titleOf(b: BlockRecord | undefined): string {
  return oneLine(b?.properties?.title) || "제목 없음";
}

/** 표 제목: 데이터베이스 페이지는 이름을 컬렉션에 둔다(아이콘이 있으면 앞에) */
function dbTitleOf(b: BlockRecord, c: CollectionRecord): string {
  const name = oneLine(c.name) || oneLine(b.properties?.title) || "제목 없는 표";
  const icon = typeof c.icon === "string" && c.icon.length <= 4 ? c.icon : "";
  return icon ? `${icon} ${name}` : name;
}

/** 회원 워크스페이스에서 날짜 칸이 있는 표(데이터베이스 페이지) 목록 */
export function listDateDatabases(userId: string): DateDb[] {
  const out: DateDb[] = [];
  for (const spaceId of memberSpaceIds(userId)) {
    const rows = db.prepare(`SELECT data FROM records WHERE tbl = 'block' AND space_id = ? AND alive = 1 AND data LIKE ?`).all(spaceId, '%"collection_view_page"%') as { data: string }[];
    for (const r of rows) {
      const b = JSON.parse(r.data) as BlockRecord;
      if (b.type !== "collection_view_page" || !b.collection_id) continue;
      const c = getRecord<CollectionRecord>("collection", b.collection_id);
      if (!c || c.alive === false) continue;
      const dateProps = Object.entries(c.schema ?? {}).filter(([, s]) => s.type === "date").map(([id, s]) => ({ id, name: s.name }));
      if (dateProps.length) out.push({ id: b.id, title: dbTitleOf(b, c), dateProps: dateProps.sort((a, z) => Number(DATE_NAME.test(z.name)) - Number(DATE_NAME.test(a.name))) });
    }
  }
  return out;
}

/** 표가 이 회원 것인지 확인하고 표·컬렉션을 돌려줌 */
export function ownDatabase(userId: string, dbId: string): { block: BlockRecord; collection: CollectionRecord } | null {
  const b = getRecord<BlockRecord>("block", dbId);
  if (!b || b.alive === false || b.type !== "collection_view_page" || !b.collection_id || !memberSpaceIds(userId).has(b.space_id ?? "")) return null;
  const c = getRecord<CollectionRecord>("collection", b.collection_id);
  return c && c.alive !== false ? { block: b, collection: c } : null;
}

interface DateVal { start_date?: string; start_time?: string; end_date?: string; end_time?: string }
function dateValue(rt: unknown): DateVal | null {
  for (const d of (Array.isArray(rt) ? rt : []) as RichText) for (const a of d?.[1] ?? []) if (a[0] === "d" && (a[1] as DateVal)?.start_date) return a[1] as DateVal;
  return null;
}

/** 표 행 → 일정(날짜 칸 propId, 비우면 표의 첫 날짜 칸). 날짜가 빈 행은 뺀다 */
export function databaseEvents(userId: string, dbId: string, propId?: string): CalEvent[] {
  const own = ownDatabase(userId, dbId);
  if (!own) return [];
  const prop = propId && own.collection.schema?.[propId]?.type === "date" ? propId : listDateProp(own.collection);
  if (!prop) return [];
  const space = memberSpace(userId);
  const dbTitle = dbTitleOf(own.block, own.collection);
  const rows = db.prepare(`SELECT data FROM records WHERE tbl = 'block' AND parent_id = ? AND alive = 1 LIMIT 2000`).all(own.collection.id) as { data: string }[];
  const out: CalEvent[] = [];
  for (const r of rows) {
    const row = JSON.parse(r.data) as BlockRecord;
    const v = dateValue(row.properties?.[prop]);
    if (!v?.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(v.start_date)) continue;
    out.push({
      rowId: row.id, dbTitle, title: titleOf(row),
      startDate: v.start_date, startTime: /^\d{2}:\d{2}$/.test(v.start_time ?? "") ? v.start_time : undefined,
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(v.end_date ?? "") ? v.end_date : undefined,
      endTime: /^\d{2}:\d{2}$/.test(v.end_time ?? "") ? v.end_time : undefined,
      url: `${APP_ORIGIN}${pageUrl(space, row.id)}`,
    });
  }
  return out;
}

function listDateProp(c: CollectionRecord): string | null {
  const dates = Object.entries(c.schema ?? {}).filter(([, s]) => s.type === "date");
  return (dates.find(([, s]) => DATE_NAME.test(s.name)) ?? dates[0])?.[0] ?? null;
}

// ---------------------------------------------------------------- ICS(RFC 5545)

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (d: string) => d.replace(/-/g, "");
const hm = (t: string) => t.replace(":", "") + "00";

function nextDay(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

function addHour(d: string, t: string): { d: string; t: string } {
  const x = new Date(`${d}T${t}:00Z`);
  x.setUTCHours(x.getUTCHours() + 1);
  return { d: x.toISOString().slice(0, 10), t: x.toISOString().slice(11, 16) };
}

/** 줄 접기: 한 줄 75바이트(UTF-8)를 넘으면 다음 줄을 공백으로 시작(한글이 깨지지 않게 글자 단위로) */
export function foldLine(line: string): string {
  const out: string[] = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildIcs(calName: string, events: CalEvent[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AIMaster//AI Work Workspace//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`, "X-WR-TIMEZONE:Asia/Seoul", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
    "BEGIN:VTIMEZONE", "TZID:Asia/Seoul", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0900", "TZOFFSETTO:+0900", "TZNAME:KST", "END:STANDARD", "END:VTIMEZONE",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.rowId}@ai-work-workspace.buylife.xyz`, `DTSTAMP:${stamp}`);
    if (e.startTime) {
      const end = e.endTime ? { d: e.endDate ?? e.startDate, t: e.endTime } : addHour(e.startDate, e.startTime);
      lines.push(`DTSTART;TZID=Asia/Seoul:${ymd(e.startDate)}T${hm(e.startTime)}`, `DTEND;TZID=Asia/Seoul:${ymd(end.d)}T${hm(end.t)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(e.startDate)}`, `DTEND;VALUE=DATE:${ymd(nextDay(e.endDate ?? e.startDate))}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(`${e.dbTitle} · AI 업무 워크스페이스\n${e.url}`)}`, `URL:${e.url}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
