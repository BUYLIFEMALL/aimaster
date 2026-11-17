// PLAN-20261117-01 E2 7-2 예약 링크 — 서버 1단계(WS-20261117-21, Master msg_b19431213421). 계획: docs/PLAN_20261117_WORKSPACE_EXPANSION.md 7-6·7-7.
// 손님이 회원의 빈 시간을 골라 예약하면 회원 본인 구글 캘린더(기본 캘린더)에 일정을 만든다. 화면·API 연결은 2단계.
//  · 기능 스위치 BOOKING_ENABLED(기본 false): 꺼져 있으면 모든 진입점(회원 처리기·손님 조회·제출·확인 작업·정리)이
//    예약 표 접속·표 생성·구글 호출 전에 끝난다. 켜는 것은 운영 저장소 표 2개 추가라 묶음 배포 승인 항목 — 시험은 격리 DB에서만.
//  · 칸 잡기: 회원 설정 행 SELECT … FOR UPDATE 안에서 우리 예약끼리 범위 겹침(앞뒤 준비 시간, 맞닿음 허용)·하루 최대 검사 후 「처리 중」으로 넣는다.
//  · 구글: 일정 id를 예약마다 고정(bk + UUID 32자, base32hex 범위)하고 같은 id로만 보낸다. 확정은 POST 성공 또는 그 id GET이
//    4조건(우리 예약 id 속성·시작·끝 같음·취소 아님, 기본 캘린더 경로) 일치일 때만. 409는 GET 검사로만 판단(fail closed).
//    생겼는지 모르는 결과(연결 끊김·10초·408·5xx)는 「확인 필요」로 칸을 유지하고, 1·5·30분 뒤 같은 id GET만 한다 — 다시 POST 0.
//    끝까지 모르면 회원이 「캘린더에 있음/없음」을 고른다. 예약 시각이 지나면 「만료」.
//  · 보관: 예약 기록·손님 정보는 받은 날로부터 30일 뒤 삭제(보관 예외 회원 제외) → 그래서 예약은 21일 앞까지만 받는다.
//  · 받은 업무 알림은 공용 sendToWorkInbox 재사용 — 받은 업무 보관은 1년이라 손님 이름·연락처는 넣지 않고 날짜·시각만.
import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, tx } from "@/litpage/server/db.ts";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import { hit } from "@/litpage/server/ratelimit.ts";
import { registerJobHandler, runDueJobs, scheduleJob } from "@/litpage/server/scheduler.ts";
import { sendToWorkInbox, type WorkInboxItem } from "@/lib/workInbox";
import { tokenOwnerAllowed } from "./tokenOwnerAccess";
import { GcalError, getEventById, insertEventWithId, listBusy, validToken, type BusyItem, type GcalRaw } from "./googleCalendar";

// 2026-11-17 WS-20261117-22 주인님 승인(Master msg_0e57ecf5a5fa): 운영 활성화 — v1.57부터 true. 끄려면 false로 바꾸는 배포(표·데이터는 그대로).
let BOOKING_ENABLED = true;
/** 시험 전용(격리 시험 DB): OFF/ON 회귀를 시험 안에서 명시적으로 바꾼다. */
export function setBookingEnabledForTests(on: boolean) {
  BOOKING_ENABLED = on;
}

interface Deps {
  ownerCheck: (userId: string) => Promise<boolean>;
  token: (userId: string, opts?: { force?: boolean }) => Promise<string>;
  inbox: (item: WorkInboxItem) => Promise<unknown>;
  sleep: (ms: number) => Promise<void>;
}
const defaultDeps: Deps = {
  ownerCheck: (userId) => tokenOwnerAllowed(userId),
  token: (userId, opts) => validToken(userId, opts),
  inbox: (item) => sendToWorkInbox(item),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};
let deps: Deps = { ...defaultDeps };
/** 시험 전용: 이용 기간 판정·구글 토큰·받은 업무 보내기·대기 바꿔 끼우기(운영 DB·실제 구글 호출 0) */
export function setBookingDepsForTests(d: Partial<Deps> | null) {
  deps = d ? { ...defaultDeps, ...d } : { ...defaultDeps };
}

const MIN = 60_000;
const DAY = 86_400_000;
export const MAX_HORIZON_DAYS = 21; // 받은 날 30일 보관 안에 만나는 일정만
export const BOOKING_RETENTION_DAYS = 30;
const CHECK_AT_MIN = [1, 5, 30]; // 「확인 필요」 GET 시각(받은 시각 기준)
const RATE_RETRIES = 3;
const VIEW_PER_MIN = 30;
const SUBMIT_PER_HOUR = 5;
const BUSY_CACHE_MS = 60_000;
const STUCK_PENDING_MS = 2 * MIN; // 처리 중에 프로세스가 끊긴 예약 → 「확인 필요」(POST가 나갔을 수도 있음)
const SLUG = "ai-work-workspace";

export type BookingStatus = "pending" | "confirmed" | "needs_check" | "failed" | "expired" | "released";

export interface BookingSettings {
  tz: string;
  days: number[]; // 0=일 … 6=토
  startMin: number; // 하루 중 시작(분)
  endMin: number;
  slotMin: number;
  beforeMin: number;
  afterMin: number;
  maxPerDay: number;
  horizonDays: number;
  notice: string;
}
export const DEFAULT_SETTINGS: BookingSettings = { tz: "Asia/Seoul", days: [1, 2, 3, 4, 5], startMin: 600, endMin: 1080, slotMin: 30, beforeMin: 0, afterMin: 0, maxPerDay: 10, horizonDays: 14, notice: "" };

// ---------------------------------------------------------------- 시간대
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" });
    fmtCache.set(tz, f);
  }
  return f;
}
export function tzParts(t: number, tz: string) {
  const o: Record<string, number> = {};
  for (const p of fmt(tz).formatToParts(new Date(t))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour % 24, mi: o.minute };
}
function offsetAt(t: number, tz: string) {
  const p = tzParts(t, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(t / MIN) * MIN;
}
export function validTz(tz: string): boolean {
  try {
    fmt(tz);
    return true;
  } catch {
    return false;
  }
}
/** 회원 시간대의 벽시계 시각 → UTC ms. 그날 없는 시각(서머타임 시작)·두 번 있는 시각(끝)은 null — 칸을 만들지 않음 */
export function wallToUtc(y: number, m: number, d: number, minOfDay: number, tz: string): number | null {
  const guess = Date.UTC(y, m - 1, d, 0, 0) + minOfDay * MIN;
  const cands = new Set<number>();
  for (const probe of [guess - DAY, guess, guess + DAY]) cands.add(guess - offsetAt(probe, tz));
  const ok = [...cands].filter((t) => {
    const p = tzParts(t, tz);
    return p.y === y && p.m === m && p.d === d && p.h * 60 + p.mi === minOfDay;
  });
  return ok.length === 1 ? ok[0] : null;
}
function localMidnight(y: number, m: number, d: number, tz: string): number {
  return wallToUtc(y, m, d, 0, tz) ?? wallToUtc(y, m, d, 60, tz) ?? Date.UTC(y, m - 1, d);
}
const dateKey = (t: number, tz: string) => {
  const p = tzParts(t, tz);
  return `${p.y}-${p.m}-${p.d}`;
};

// ---------------------------------------------------------------- 빈 칸 계산
type Range = [number, number];
const overlaps = (a: Range, b: Range) => a[0] < b[1] && b[0] < a[1]; // 맞닿음은 겹침 아님

/** 구글 바쁜 구간 → 범위. 종일 일정은 회원 시간대의 그 날(들) 전체 */
export function busyRanges(items: BusyItem[], tz: string): Range[] {
  const out: Range[] = [];
  for (const x of items) {
    if (x.start && x.end) {
      const s = Date.parse(x.start), e = Date.parse(x.end);
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) out.push([s, e]);
    } else if (x.startDate) {
      const [sy, sm, sd] = x.startDate.split("-").map(Number);
      const [ey, em, ed] = (x.endDate ?? x.startDate).split("-").map(Number);
      const s = localMidnight(sy, sm, sd, tz);
      let e = localMidnight(ey, em, ed, tz);
      if (e <= s) e = s + DAY;
      out.push([s, e]);
    }
  }
  return out;
}

/** 설정상 그 날 열리는 칸 시작 시각들(바쁨 무시) */
function dayStarts(s: BookingSettings, y: number, m: number, d: number): number[] {
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (!s.days.includes(wd)) return [];
  const out: number[] = [];
  for (let x = s.startMin; x + s.slotMin <= s.endMin; x += s.slotMin) {
    const t = wallToUtc(y, m, d, x, s.tz);
    if (t !== null) out.push(t);
  }
  return out;
}

export interface Slot { start: number; end: number }

/** 우리 예약 하나 — 받을 때 약속한 앞뒤 준비 시간 스냅샷 포함(QA024 P1-2) */
export interface Held { start: number; end: number; beforeMin: number; afterMin: number }
/** 점유 구간 = [시작 − 앞 준비, 끝 + 뒤 준비]. 새 후보와 기존 예약 모두 자기 준비 시간으로 → 넣는 순서와 상관없이 대칭 */
export const occupied = (h: Held): Range => [h.start - h.beforeMin * MIN, h.end + h.afterMin * MIN];

/** 손님에게 보일 빈 칸: 설정 요일·시간대, 지금 이후·horizon 안, 하루 최대.
 *  준비 시간 적용은 한 번씩만: 후보는 자기 준비 시간을 더한 점유 구간, 구글 일정은 그대로(준비 시간 없음), 우리 예약은 그 예약의 스냅샷 준비 시간. */
export function computeSlots(s: BookingSettings, busy: Range[], holding: Held[], now: number): Slot[] {
  const horizonDays = Math.min(MAX_HORIZON_DAYS, s.horizonDays);
  const until = now + horizonDays * DAY;
  const perDay = new Map<string, number>();
  for (const h of holding) perDay.set(dateKey(h.start, s.tz), (perDay.get(dateKey(h.start, s.tz)) ?? 0) + 1);
  const all = [...busy, ...holding.map(occupied)];
  const today = tzParts(now, s.tz);
  const out: Slot[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
    if ((perDay.get(`${y}-${m}-${d}`) ?? 0) >= s.maxPerDay) continue;
    for (const start of dayStarts(s, y, m, d)) {
      if (start <= now || start > until) continue;
      const end = start + s.slotMin * MIN;
      const want = occupied({ start, end, beforeMin: s.beforeMin, afterMin: s.afterMin });
      if (all.some((b) => overlaps(want, b))) continue;
      out.push({ start, end });
    }
  }
  return out;
}

/** 그 시각이 설정상 열리는 칸 시작인가(제출 검사) */
function offeredStart(s: BookingSettings, start: number): boolean {
  const p = tzParts(start, s.tz);
  return dayStarts(s, p.y, p.m, p.d).includes(start);
}

export function cleanSettings(raw: unknown): BookingSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const int = (v: unknown, lo: number, hi: number, dflt: number) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
  };
  const tz = typeof r.tz === "string" && validTz(r.tz) ? r.tz : DEFAULT_SETTINGS.tz;
  const days = Array.isArray(r.days) ? [...new Set(r.days.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort() : DEFAULT_SETTINGS.days;
  if (!days.length) throw new ApiError("예약 받을 요일을 하나 이상 골라 주세요.", 400);
  const s: BookingSettings = {
    tz,
    days,
    startMin: int(r.startMin, 0, 1439, DEFAULT_SETTINGS.startMin),
    endMin: int(r.endMin, 1, 1440, DEFAULT_SETTINGS.endMin),
    slotMin: int(r.slotMin, 15, 240, DEFAULT_SETTINGS.slotMin),
    beforeMin: int(r.beforeMin, 0, 120, 0),
    afterMin: int(r.afterMin, 0, 120, 0),
    maxPerDay: int(r.maxPerDay, 1, 50, DEFAULT_SETTINGS.maxPerDay),
    horizonDays: int(r.horizonDays, 1, MAX_HORIZON_DAYS, DEFAULT_SETTINGS.horizonDays),
    notice: typeof r.notice === "string" ? r.notice.trim().slice(0, 500) : "",
  };
  if (s.startMin + s.slotMin > s.endMin) throw new ApiError("끝 시각은 시작 시각보다 한 칸 이상 뒤여야 합니다.", 400);
  return s;
}

// ---------------------------------------------------------------- 저장
/** 예약 표 2개 + 색인 정의(첫 사용 때 만든다). 시험이 같은 정의로 「다른 인스턴스」를 흉내 내도록 내보낸다 */
export const BOOKING_DDL = `CREATE TABLE IF NOT EXISTS aww_booking_pages (
    user_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, enabled INTEGER NOT NULL, settings TEXT NOT NULL,
    created_time BIGINT NOT NULL, updated_time BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS aww_bookings (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, start_ms BIGINT NOT NULL, end_ms BIGINT NOT NULL, status TEXT NOT NULL,
    gcal_id TEXT NOT NULL, guest_name TEXT, guest_contact TEXT, guest_memo TEXT, final_unknown INTEGER NOT NULL DEFAULT 0,
    fail_reason TEXT, notified TEXT, created_time BIGINT NOT NULL, updated_time BIGINT NOT NULL,
    before_min INTEGER NOT NULL DEFAULT 0 CHECK (before_min >= 0 AND before_min <= 120),
    after_min INTEGER NOT NULL DEFAULT 0 CHECK (after_min >= 0 AND after_min <= 120));
  CREATE INDEX IF NOT EXISTS idx_aww_bookings_user ON aww_bookings(user_id, start_ms)`;
let tablesReady = false;
/** 시험 전용: 표 준비 표시 되돌리기(격리 시험 DB에서 첫 생성을 다시 재현할 때) */
export function resetBookingTablesForTests() {
  tablesReady = false;
}
/**
 * WS-20261117-23(P2, 운영 v1.57에서 1회 관찰): 서로 다른 서버 인스턴스가 동시에 처음 만들면 `CREATE TABLE IF NOT EXISTS`끼리
 * `pg_type_typname_nsp_index` 중복으로 한쪽이 실패한다 → 표 2개·색인을 한 DB 거래 안에서, 예약 표 전용 잠금
 * (`pg_advisory_xact_lock(hashtext('aww:booking:ddl'))`, 이 저장소의 다른 잠금 0 — 거래가 끝나면 자동 해제)을 잡은 뒤 만든다.
 * 다른 인스턴스는 잠금이 풀린 뒤(=앞 거래 커밋 뒤) 「이미 있음」으로 지나간다. 준비 표시는 커밋 성공 뒤에만 켜고, 실패하면 그대로 꺼져 있어 다음 요청이 다시 시도한다.
 */
function ensureTables() {
  if (tablesReady) return;
  tx(() => {
    db.prepare("SELECT pg_advisory_xact_lock(hashtext('aww:booking:ddl'))").get();
    db.exec(BOOKING_DDL);
  });
  tablesReady = true;
}

interface PageRow { user_id: string; token_hash: string; enabled: number; settings: string; created_time: number; updated_time: number }
// QA024(2026-11-17): before_min·after_min = 예약을 받을 때의 준비 시간 스냅샷(cleanSettings와 같은 0~120분). 스위치 OFF라 운영·aww_dev에는
// 이 표 자체가 없고 자동 ALTER도 하지 않는다. DEFAULT 0은 새 칸을 채우기 위한 값일 뿐, 이 칸이 없던 옛 표가 있었다면 그 예약의 실제 당시
// 준비 시간으로 복구됐다는 뜻이 아니다(그런 표는 지금 어디에도 없음).
interface BookingRow { id: string; user_id: string; start_ms: number; end_ms: number; status: BookingStatus; gcal_id: string; guest_name: string | null; guest_contact: string | null; guest_memo: string | null; final_unknown: number; fail_reason: string | null; notified: string | null; created_time: number; updated_time: number; before_min: number; after_min: number }

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
/** 구글 일정 id: base32hex(소문자 a~v·0~9) 5~1024자 — UUID 16진수는 그 범위 안 */
export const gcalIdOf = (bookingId: string) => `bk${bookingId.replace(/-/g, "").toLowerCase()}`;

function toBooking(r: any): BookingRow {
  return { ...r, start_ms: Number(r.start_ms), end_ms: Number(r.end_ms), final_unknown: Number(r.final_unknown), created_time: Number(r.created_time), updated_time: Number(r.updated_time), before_min: Number(r.before_min ?? 0), after_min: Number(r.after_min ?? 0) };
}
const heldOf = (b: Pick<BookingRow, "start_ms" | "end_ms" | "before_min" | "after_min">): Held => ({ start: b.start_ms, end: b.end_ms, beforeMin: b.before_min, afterMin: b.after_min });
function loadBooking(id: string): BookingRow | null {
  const r = db.prepare("SELECT * FROM aww_bookings WHERE id = ?").get(id);
  return r ? toBooking(r) : null;
}
/** 칸을 잡고 있는 우리 예약(처리 중·확정·확인 필요). 준비 시간이 최대 120분이라 앞뒤 하루를 넉넉히 읽는다 */
function holdings(userId: string, from: number, to: number): Held[] {
  const rows = db.prepare(`SELECT start_ms, end_ms, before_min, after_min FROM aww_bookings WHERE user_id = ? AND status IN ('pending','confirmed','needs_check') AND end_ms > ? AND start_ms < ?`).all(userId, from - DAY, to + DAY) as any[];
  return rows.map((r) => ({ start: Number(r.start_ms), end: Number(r.end_ms), beforeMin: Number(r.before_min ?? 0), afterMin: Number(r.after_min ?? 0) }));
}
/**
 * 상태 바꾸기는 언제나 기대 상태일 때만(compare-and-set). 바뀐 줄이 1이면 true — 알림·다음 확인 예약은 true일 때만 한다.
 * 구글 응답을 기다리는 동안 회원이 고른 결정(칸 풀림·확정)·만료·다른 worker의 결과를 늦은 응답이 덮어쓰지 않게(QA024 P1-1).
 * openOnly: 「확인 필요」 중 최종 미확인(회원 결정 대기)이 아닌 것만.
 */
function transition(id: string, from: BookingStatus[], to: BookingStatus, extra: { fail_reason?: string | null; final_unknown?: number } = {}, openOnly = false): boolean {
  const marks = from.map(() => "?").join(", ");
  return db.prepare(`UPDATE aww_bookings SET status = ?, fail_reason = COALESCE(?, fail_reason), final_unknown = COALESCE(?, final_unknown), updated_time = ?
                     WHERE id = ? AND status IN (${marks})${openOnly ? " AND final_unknown = 0" : ""}`)
    .run(to, extra.fail_reason ?? null, extra.final_unknown ?? null, Date.now(), id, ...from).changes === 1;
}
function pageByToken(token: string): { page: PageRow; settings: BookingSettings } | null {
  const p = db.prepare("SELECT * FROM aww_booking_pages WHERE token_hash = ?").get(hashToken(token)) as PageRow | undefined;
  if (!p || Number(p.enabled) !== 1) return null;
  return { page: p, settings: cleanSettings(JSON.parse(p.settings)) };
}

// ---------------------------------------------------------------- 받은 업무 알림(한 상태당 한 번 — 보낸 뒤 실패해도 다시 보내지 않음)
function label(b: BookingRow, tz: string) {
  const p = tzParts(b.start_ms, tz);
  return `${p.m}월 ${p.d}일 ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}
type NoticeKind = "confirmed" | "check" | "failed";
async function notify(b: BookingRow, kind: NoticeKind, tz: string) {
  const claimed = db.prepare("UPDATE aww_bookings SET notified = ? WHERE id = ? AND (notified IS NULL OR notified <> ?)").run(kind, b.id, kind).changes === 1;
  if (!claimed) return;
  const when = label(b, tz);
  const reason = b.fail_reason ?? "";
  const item: WorkInboxItem =
    kind === "confirmed"
      ? { userId: b.user_id, sourceSlug: SLUG, kind: "task", title: `📅 새 예약 확정: ${when}`, bodyMd: "구글 캘린더에 일정이 들어갔습니다. 손님 이름·연락처는 예약 목록에서 확인하세요(받은 날부터 30일 보관)." }
      : kind === "check"
        ? { userId: b.user_id, sourceSlug: SLUG, kind: "task", title: `⚠️ 예약 확인 필요: ${when}`, bodyMd: "구글 캘린더에 일정이 들어갔는지 확인하지 못했습니다. 캘린더를 본 뒤 예약 목록에서 「캘린더에 있음」 또는 「없음(칸 풀기)」을 골라 주세요. 그동안 이 칸은 다른 손님에게 열리지 않습니다." }
        : { userId: b.user_id, sourceSlug: SLUG, kind: "task", title: `❌ 예약을 받지 못함: ${when}`, bodyMd: reason === "auth" ? "구글 연결이 끊겨 일정을 만들지 못했습니다. 「캘린더 연동」에서 구글을 다시 연결해 주세요. 이 칸은 다시 열렸습니다." : `구글 캘린더가 일정 만들기를 거절했습니다(${reason || "알 수 없음"}). 이 칸은 다시 열렸습니다.` };
  try {
    await deps.inbox(item);
  } catch (e) {
    console.error(`[booking] inbox notice failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------- 구글 결과 판정
export type InsertOutcome = "confirmed" | "verify" | "auth" | "retry_rate" | "unknown" | "fail";
/** 공식 /guides/errors 기준. 생겼는지 모르는 것만 unknown(칸 유지), 거절이 확실한 것은 fail(칸 해제) */
export function classifyInsert(r: GcalRaw): InsertOutcome {
  if (r.status >= 200 && r.status < 300) return "confirmed";
  if (r.status === 409) return "verify";
  if (r.status === 401) return "auth";
  if (r.status === 429 || (r.status === 403 && (r.reason === "rateLimitExceeded" || r.reason === "userRateLimitExceeded"))) return "retry_rate";
  if (r.status === 0 || r.status === 408 || r.status >= 500) return "unknown";
  return "fail"; // 400·403(quotaExceeded·기타)·404·그 밖의 4xx
}

type Verify = "match" | "mismatch" | "absent" | "unknown";
/** 그 id 일정이 이 예약인가 — 우리 예약 id 속성·시작·끝·취소 아님(기본 캘린더 경로로 읽음) */
async function verifyById(token: string, b: BookingRow): Promise<Verify> {
  const r = await getEventById(token, b.gcal_id);
  if (r.status === 200) {
    const e = r.body;
    const ok = e?.extendedProperties?.private?.awwBookingId === b.id && Date.parse(e?.start?.dateTime) === b.start_ms && Date.parse(e?.end?.dateTime) === b.end_ms && e?.status !== "cancelled";
    return ok ? "match" : "mismatch";
  }
  if (r.status === 410) return "mismatch"; // 만들어졌다가 지워짐 — 확정하지 않고 회원이 고름
  if (r.status === 404) return "absent"; // 반영 지연일 수 있어 칸을 풀지 않음
  return "unknown";
}

function scheduleCheck(b: BookingRow, step: number) {
  const at = Math.max(Date.now() + 1000, b.created_time + CHECK_AT_MIN[step - 1] * MIN);
  scheduleJob("booking.reconcile", `booking:${b.id}`, at, { ownerId: b.user_id, bookingId: b.id, step });
}
/** 처리 중 → 확인 필요(바뀌었을 때만 첫 확인 예약) */
function toNeedsCheck(b: BookingRow): boolean {
  if (!transition(b.id, ["pending"], "needs_check")) return false;
  scheduleCheck(b, 1);
  return true;
}
/** 확정(바뀌었을 때만 알림). from = 이 경로가 기대하는 상태 */
async function confirmFrom(b: BookingRow, from: BookingStatus, tz: string): Promise<boolean> {
  if (!transition(b.id, [from], "confirmed", {}, from === "needs_check")) return false;
  await notify(b, "confirmed", tz);
  return true;
}
/** 최종 미확인 → 회원이 고름(바뀌었을 때만 알림) */
async function finalUnknown(b: BookingRow, from: BookingStatus, tz: string): Promise<boolean> {
  if (!transition(b.id, [from], "needs_check", { final_unknown: 1 }, from === "needs_check")) return false;
  await notify(b, "check", tz);
  return true;
}
/** 처리 중 → 실패·칸 해제(바뀌었을 때만 알림) */
async function fail(b: BookingRow, reason: string, tz: string, tell = true): Promise<boolean> {
  if (!transition(b.id, ["pending"], "failed", { fail_reason: reason })) return false;
  if (tell) await notify({ ...b, fail_reason: reason }, "failed", tz);
  return true;
}
/** 상태 바꾸기에 실패했으면(그사이 다른 쪽이 바꿈) 지금 실제 상태를 돌려준다 */
function currentStatus(id: string): BookingStatus | null {
  return loadBooking(id)?.status ?? null;
}

// ---------------------------------------------------------------- 손님: 빈 칸 보기·예약하기
const busyCache = new Map<string, { at: number; until: number; busy: Range[] }>();

function tokenOk(token: unknown): token is string {
  return typeof token === "string" && token.length >= 20 && token.length <= 100;
}

export interface SlotsView { tz: string; notice: string; slotMin: number; slots: Slot[]; unavailable: boolean }

/** 손님 화면: 조건이 하나라도 안 맞으면 null(화면은 404). ip는 요청 한도용(저장 안 함) */
export async function bookingSlots(token: string, ip: string, now = Date.now()): Promise<SlotsView | null> {
  if (!BOOKING_ENABLED) return null;
  if (!tokenOk(token)) return null;
  if (!hit(`aww-book-view:${ip || "?"}`, VIEW_PER_MIN, MIN, now)) return null;
  ensureTables();
  const pg = pageByToken(token);
  if (!pg) return null;
  const { page, settings } = pg;
  if (!(await deps.ownerCheck(page.user_id).catch(() => false))) return null;
  let gtoken: string;
  try {
    gtoken = await deps.token(page.user_id);
  } catch {
    return null; // 구글 연결이 끊기면 예약 주소도 닫힘
  }
  const until = now + Math.min(MAX_HORIZON_DAYS, settings.horizonDays) * DAY + DAY;
  const base = { tz: settings.tz, notice: settings.notice, slotMin: settings.slotMin };
  let busy: Range[];
  const c = busyCache.get(page.user_id);
  if (c && now - c.at < BUSY_CACHE_MS && c.until >= until) busy = c.busy;
  else {
    try {
      busy = busyRanges(await listBusy(gtoken, new Date(now - DAY).toISOString(), new Date(until).toISOString()), settings.tz);
    } catch {
      return { ...base, slots: [], unavailable: true }; // 끝까지 못 읽으면 빈 칸이라고 단정하지 않음
    }
    busyCache.set(page.user_id, { at: now, until, busy });
  }
  return { ...base, slots: computeSlots(settings, busy, holdings(page.user_id, now - DAY, until), now), unavailable: false };
}

export type SubmitResult = { ok: true; status: "confirmed" | "received"; bookingId: string } | { ok: false; error: string };

/** 손님 제출. null = 주소 닫힘(404) */
export async function bookingSubmit(token: string, ip: string, input: { start?: unknown; name?: unknown; contact?: unknown; memo?: unknown }, now = Date.now()): Promise<SubmitResult | null> {
  if (!BOOKING_ENABLED) return null;
  if (!tokenOk(token)) return null;
  if (!hit(`aww-book-submit:${ip || "?"}`, SUBMIT_PER_HOUR, 60 * MIN, now)) return { ok: false, error: "예약 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  ensureTables();
  const pg = pageByToken(token);
  if (!pg) return null;
  const { page } = pg; // 설정은 잠금 안에서 다시 읽는다
  if (!(await deps.ownerCheck(page.user_id).catch(() => false))) return null;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const contact = typeof input.contact === "string" ? input.contact.trim() : "";
  const memo = typeof input.memo === "string" ? input.memo.trim() : "";
  if (!name || name.length > 50) return { ok: false, error: "이름을 1~50자로 적어 주세요." };
  if (!contact || contact.length > 100) return { ok: false, error: "연락처를 1~100자로 적어 주세요." };
  if (memo.length > 500) return { ok: false, error: "메모는 500자까지 적을 수 있습니다." };
  const start = Number(input.start);
  if (!Number.isFinite(start)) return { ok: false, error: "선택한 시간은 예약할 수 없습니다. 다른 시간을 골라 주세요." };
  const tokenHash = hashToken(token);

  // 칸 잡기 — 회원 설정 행 잠금으로 같은 회원 예약을 한 줄로 세운다(다른 worker는 잠금이 풀린 뒤 같은 검사를 다시 함).
  // QA024 P2: 잠금을 잡은 뒤 지금의 켜짐·주소(토큰 해시)·설정을 다시 읽어 판정한다 — 잠금을 기다리는 사이 회원이 끄거나 주소를 바꾸거나
  // 설정을 고쳤으면 옛 요청은 넣지도 구글에 보내지도 않는다. 판정·저장은 모두 이 잠금 안의 설정으로.
  const id = randomUUID();
  const outcome = tx(() => {
    const cur = db.prepare("SELECT * FROM aww_booking_pages WHERE user_id = ? FOR UPDATE").get(page.user_id) as PageRow | undefined;
    if (!cur || Number(cur.enabled) !== 1 || cur.token_hash !== tokenHash) return { kind: "closed" as const };
    let s: BookingSettings;
    try {
      s = cleanSettings(JSON.parse(cur.settings));
    } catch {
      return { kind: "closed" as const };
    }
    const horizon = now + Math.min(MAX_HORIZON_DAYS, s.horizonDays) * DAY;
    if (start <= now || start > horizon || !offeredStart(s, start)) return { kind: "invalid" as const };
    const mine: Held = { start, end: start + s.slotMin * MIN, beforeMin: s.beforeMin, afterMin: s.afterMin };
    const hold = holdings(page.user_id, mine.start, mine.end);
    if (hold.some((h) => overlaps(occupied(mine), occupied(h)))) return { kind: "taken" as const };
    const key = dateKey(start, s.tz);
    if (hold.filter((h) => dateKey(h.start, s.tz) === key).length >= s.maxPerDay) return { kind: "full" as const };
    const t = Date.now();
    db.prepare(`INSERT INTO aww_bookings (id, user_id, start_ms, end_ms, status, gcal_id, guest_name, guest_contact, guest_memo, final_unknown, created_time, updated_time, before_min, after_min)
                VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?, ?, ?, ?)`).run(id, page.user_id, mine.start, mine.end, gcalIdOf(id), name, contact, memo, t, t, s.beforeMin, s.afterMin);
    return { kind: "ok" as const, s };
  });
  if (outcome.kind === "closed") return null;
  if (outcome.kind === "invalid") return { ok: false, error: "선택한 시간은 예약할 수 없습니다. 다른 시간을 골라 주세요." };
  if (outcome.kind === "taken") return { ok: false, error: "방금 다른 예약이 들어온 시간입니다. 다른 시간을 골라 주세요." };
  if (outcome.kind === "full") return { ok: false, error: "그날은 예약이 모두 찼습니다. 다른 날을 골라 주세요." };
  busyCache.delete(page.user_id);
  const b = loadBooking(id)!;
  // 이용 기간 판정은 비동기(Supabase)라 DB 잠금 안에서 할 수 없다 → 잠금 전 판정에 더해, 칸을 잡은 뒤 구글에 보내기 직전 한 번 더.
  // 그사이 끝났으면 아무것도 보내지 않고 칸을 푼다.
  if (!(await deps.ownerCheck(page.user_id).catch(() => false))) {
    await fail(b, "owner", outcome.s.tz, false);
    return null;
  }
  const status = await placeOnCalendar(b, outcome.s);
  if (status === "confirmed") return { ok: true, status: "confirmed", bookingId: id };
  if (status === "needs_check" || status === "pending") return { ok: true, status: "received", bookingId: id };
  if (status === "taken") return { ok: false, error: "방금 회원 일정이 들어온 시간입니다. 다른 시간을 골라 주세요." };
  return { ok: false, error: "지금은 예약을 받을 수 없습니다. 잠시 후 다시 시도해 주세요." };
}

/** 잠금 밖: 구글 재확인 → 같은 id로 POST. 상태는 모두 「처리 중」에서만 바꾸고(CAS), 못 바꿨으면 그사이 정해진 실제 상태를 돌려준다 */
async function placeOnCalendar(b: BookingRow, s: BookingSettings): Promise<BookingStatus | "taken"> {
  const settled = (): BookingStatus => currentStatus(b.id) ?? "failed";
  let tok: string;
  try {
    tok = await deps.token(b.user_id);
  } catch (e) {
    const auth = e instanceof GcalError && e.code === "auth";
    return (await fail(b, auth ? "auth" : "token", s.tz, auth)) ? "failed" : settled();
  }
  // 회원이 방금 구글에 직접 넣은 일정과 겹치는지 한 번 더(원자적이지 않음 — 남는 위험은 계획 7-6 4에 명시).
  // 구글 일정에는 준비 시간이 없으므로 이 예약 자신의 스냅샷 준비 시간만 한 번 적용.
  try {
    const busy = busyRanges(await listBusy(tok, new Date(b.start_ms - DAY).toISOString(), new Date(b.end_ms + DAY).toISOString()), s.tz);
    const want = occupied(heldOf(b));
    if (busy.some((x) => overlaps(want, x))) return (await fail(b, "taken", s.tz, false)) ? "taken" : settled();
  } catch {
    return (await fail(b, "recheck", s.tz, false)) ? "failed" : settled(); // 아직 아무것도 보내지 않았으니 칸을 풀어도 안전
  }
  const body = {
    id: b.gcal_id,
    status: "confirmed",
    summary: `예약: ${b.guest_name ?? "손님"}`, // 구글 일정에는 이름만(연락처·메모 기록 안 함)
    description: "AI 업무 워크스페이스 예약 링크로 받은 예약입니다.",
    start: { dateTime: new Date(b.start_ms).toISOString() },
    end: { dateTime: new Date(b.end_ms).toISOString() },
    extendedProperties: { private: { awwBookingId: b.id } },
  };
  let authRetried = false;
  let rateTries = 0;
  for (;;) {
    // QA024 재검토 P2: 실제로 보내기 직전마다(첫 시도·429 대기 뒤·401 토큰 갱신 뒤) 「처리 중」인지 다시 본다.
    // 그사이 정리됐으면(끊긴 것으로 넘어감·만료 등) 더 보내지 않고 지금 상태를 돌려준다(알림·작업 0).
    // 이미 나가 있는 요청을 취소한다는 보장은 아니고, 앞으로 추가로 보내는 것만 막는다.
    if (currentStatus(b.id) !== "pending") return settled();
    const r = await insertEventWithId(tok, body);
    const k = classifyInsert(r);
    if (k === "confirmed") return (await confirmFrom(b, "pending", s.tz)) ? "confirmed" : settled();
    if (k === "auth" && !authRetried) {
      authRetried = true;
      try {
        tok = await deps.token(b.user_id, { force: true });
        continue;
      } catch {
        /* 아래 실패 처리 */
      }
    }
    if (k === "auth") return (await fail(b, "auth", s.tz)) ? "failed" : settled();
    if (k === "retry_rate" && rateTries < RATE_RETRIES) {
      await deps.sleep(1000 * 2 ** rateTries++);
      continue;
    }
    if (k === "retry_rate") return (await fail(b, `rate ${r.status}`, s.tz)) ? "failed" : settled();
    if (k === "verify") {
      const v = await verifyById(tok, b).catch(() => "unknown" as const);
      if (v === "match") return (await confirmFrom(b, "pending", s.tz)) ? "confirmed" : settled();
      // 같은 id의 다른 일정·취소 일정 — 확정하지 않음, 새 id로 다시 만들지 않음
      if (v === "mismatch") return (await finalUnknown(b, "pending", s.tz)) ? "needs_check" : settled();
      return toNeedsCheck(b) ? "needs_check" : settled();
    }
    if (k === "unknown") return toNeedsCheck(b) ? "needs_check" : settled();
    return (await fail(b, `${r.status}${r.reason ? ` ${r.reason}` : ""}`, s.tz)) ? "failed" : settled();
  }
}

// ---------------------------------------------------------------- 「확인 필요」 확인 작업(GET만, 다시 POST 0)
async function settingsOf(userId: string): Promise<BookingSettings> {
  const p = db.prepare("SELECT settings FROM aww_booking_pages WHERE user_id = ?").get(userId) as { settings: string } | undefined;
  return p ? cleanSettings(JSON.parse(p.settings)) : DEFAULT_SETTINGS;
}

export async function reconcileBooking(payload: unknown): Promise<void> {
  if (!BOOKING_ENABLED) return;
  const p = (payload ?? {}) as { bookingId?: unknown; step?: unknown };
  ensureTables();
  const b = loadBooking(String(p.bookingId ?? ""));
  if (!b || b.status !== "needs_check" || b.final_unknown === 1) return;
  const step = Math.min(CHECK_AT_MIN.length, Math.max(1, Number(p.step) || 1));
  const s = await settingsOf(b.user_id);
  if (b.start_ms <= Date.now()) {
    transition(b.id, ["needs_check"], "expired", {}, true); // 예약 시각이 지나면 칸 유지 의미 없음
    return;
  }
  let v: Verify = "unknown";
  try {
    v = await verifyById(await deps.token(b.user_id), b);
  } catch {
    v = "unknown";
  }
  // 여기부터는 GET을 기다리는 사이 회원이 고른 결정·만료·다른 worker 결과를 덮지 않게 모두 「확인 필요(최종 미확인 아님)」에서만 바꾼다
  if (v === "match") {
    await confirmFrom(b, "needs_check", s.tz);
    return;
  }
  if (v === "mismatch" || step >= CHECK_AT_MIN.length) {
    await finalUnknown(b, "needs_check", s.tz);
    return;
  }
  // absent(404)·unknown — 칸 유지, 아직 열린 「확인 필요」일 때만 다음 확인 예약
  if (transition(b.id, ["needs_check"], "needs_check", {}, true)) scheduleCheck(b, step + 1);
}
registerJobHandler("booking.reconcile", (payload) => reconcileBooking(payload));

// ---------------------------------------------------------------- 회원 처리기(2단계에서 RPC에 연결)
function member(ctx: Ctx): string {
  if (!BOOKING_ENABLED) throw new ApiError("Not found", 404);
  if (!ctx.userId) throw new ApiError("Unauthorized", 401);
  ensureTables();
  return ctx.userId;
}
function readPage(userId: string): PageRow | undefined {
  return db.prepare("SELECT * FROM aww_booking_pages WHERE user_id = ?").get(userId) as PageRow | undefined;
}
function pageInfo(p: PageRow | undefined) {
  return { exists: !!p, enabled: !!p && Number(p.enabled) === 1, settings: p ? cleanSettings(JSON.parse(p.settings)) : DEFAULT_SETTINGS, maxHorizonDays: MAX_HORIZON_DAYS };
}

/** 처리 중에 끊긴 예약 → 확인 필요, 지난 예약 → 만료. 회원 목록을 열 때와 확인 작업 전에 */
function sweep(userId: string, now: number) {
  db.prepare("UPDATE aww_bookings SET status = 'expired', updated_time = ? WHERE user_id = ? AND status IN ('pending','needs_check') AND start_ms <= ?").run(now, userId, now);
  const stuck = db.prepare("SELECT * FROM aww_bookings WHERE user_id = ? AND status = 'pending' AND created_time < ?").all(userId, now - STUCK_PENDING_MS) as any[];
  for (const r of stuck) toNeedsCheck(toBooking(r));
}

export const bookingHandlers = {
  bookingGet(ctx: Ctx) {
    return pageInfo(readPage(member(ctx)));
  },

  /** 켜기·설정 바꾸기. 처음·다시 켤 때·rotate일 때만 새 주소 토큰(원문)을 한 번 돌려줌 */
  bookingSave(ctx: Ctx, { settings, rotate }: { settings?: unknown; rotate?: unknown }) {
    const userId = member(ctx);
    const s = JSON.stringify(cleanSettings(settings));
    const now = Date.now();
    const token = tx(() => {
      const fresh = newToken();
      const created = db.prepare(`INSERT INTO aww_booking_pages (user_id, token_hash, enabled, settings, created_time, updated_time)
                VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT (user_id) DO NOTHING`).run(userId, hashToken(fresh), s, now, now).changes === 1;
      if (created) return fresh;
      const cur = db.prepare("SELECT * FROM aww_booking_pages WHERE user_id = ? FOR UPDATE").get(userId) as PageRow;
      const next = Number(cur.enabled) !== 1 || rotate === true ? fresh : null;
      db.prepare("UPDATE aww_booking_pages SET token_hash = ?, enabled = 1, settings = ?, updated_time = ? WHERE user_id = ?").run(next ? hashToken(next) : cur.token_hash, s, now, userId);
      return next;
    });
    busyCache.delete(userId);
    return { ...pageInfo(readPage(userId)), token };
  },

  /** 끄기(주소 즉시 닫힘) */
  bookingOff(ctx: Ctx) {
    const userId = member(ctx);
    db.prepare("UPDATE aww_booking_pages SET enabled = 0, updated_time = ? WHERE user_id = ?").run(Date.now(), userId);
    return pageInfo(readPage(userId));
  },

  /** 예약 목록(회원 본인 것만). cron-job.org가 없어도 목록을 열 때 때가 된 확인 작업을 이 회원 것만 한 번 돌림 */
  async bookingList(ctx: Ctx) {
    const userId = member(ctx);
    const now = Date.now();
    sweep(userId, now);
    await runDueJobs(now, 50, (job) => job.kind === "booking.reconcile" && (job.payload as { ownerId?: unknown })?.ownerId === userId);
    const rows = (db.prepare("SELECT * FROM aww_bookings WHERE user_id = ? ORDER BY start_ms DESC LIMIT 200").all(userId) as any[]).map(toBooking);
    return rows.map((b) => ({ id: b.id, start: b.start_ms, end: b.end_ms, status: b.status, finalUnknown: b.final_unknown === 1, name: b.guest_name, contact: b.guest_contact, memo: b.guest_memo, createdTime: b.created_time }));
  },

  /** 「확인 필요」를 회원이 직접: present = 캘린더에 있음(확정), absent = 없음(칸 풀기) */
  bookingResolve(ctx: Ctx, { id, choice }: { id?: unknown; choice?: unknown }) {
    const userId = member(ctx);
    if (choice !== "present" && choice !== "absent") throw new ApiError("Bad request", 400);
    const changed = db.prepare("UPDATE aww_bookings SET status = ?, updated_time = ? WHERE id = ? AND user_id = ? AND status = 'needs_check'")
      .run(choice === "present" ? "confirmed" : "released", Date.now(), String(id ?? ""), userId).changes;
    if (changed !== 1) throw new ApiError("Not found", 404);
    return { ok: true };
  },
};

// ---------------------------------------------------------------- 30일 정리(운영 하루 1회 /api/cron/jobs)
/** 받은 날로부터 30일 지난 예약 기록·손님 정보 삭제(보관 예외 회원 제외). 스위치가 꺼져 있으면 DB 접속 없이 끝 */
export function runBookingRetention(now = Date.now(), exempt: ReadonlySet<string> = new Set()): { bookings: number } | { skipped: "off" } {
  if (!BOOKING_ENABLED) return { skipped: "off" };
  ensureTables();
  const cutoff = now - BOOKING_RETENTION_DAYS * DAY;
  const skip = [...exempt];
  const not = skip.length ? ` AND user_id NOT IN (${skip.map(() => "?").join(", ")})` : "";
  return { bookings: db.prepare(`DELETE FROM aww_bookings WHERE created_time < ?${not}`).run(cutoff, ...skip).changes };
}
