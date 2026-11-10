// 구글 캘린더 연동(2026-11-11) — 워크스페이스 명령(/api/rpc/cal*). ① 간편 구독(ICS) ② 구글 계정 연결(OAuth)을 회원이 골라 쓴다.
// 플랜 docs/PLAN_20261111_GOOGLE_CALENDAR.md. 저장: 워크스페이스 자체 표(aww_cal_feeds·aww_gcal_links), 구글 토큰은 공용 member_platform_accounts.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import { extraHandlers } from "@/litpage/server/api/extra.ts";
import { storeFile } from "@/litpage/server/content/files.ts";
import { db } from "@/litpage/server/db.ts";
import { APP_ORIGIN, buildIcs, databaseEvents, listDateDatabases, ownDatabase, type CalEvent } from "./calendarData";
import { disconnectGcal, GcalError, getGoogleApp, GOOGLE_REDIRECT_URI, listGoogleEvents, loadGcalAccount, upsertGoogleEvent, validToken } from "./googleCalendar";
import { memberSpace } from "./workInbox";

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;
const MAX_FEED_DBS = 10;
const MAX_PUSH = 200;

function uid(ctx: Ctx): string {
  if (!ctx.userId) throw new ApiError("Unauthorized", 401);
  return ctx.userId;
}

let ready = false;
export function ensureCalendarTables() {
  if (ready) return;
  db.exec(`
CREATE TABLE IF NOT EXISTS aww_cal_feeds (user_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, data TEXT NOT NULL, updated_time INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS aww_gcal_links (user_id TEXT NOT NULL, direction TEXT NOT NULL, local_id TEXT NOT NULL, google_id TEXT NOT NULL, updated_time INTEGER NOT NULL, PRIMARY KEY (user_id, direction, local_id));
`);
  ready = true;
}

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const feedUrl = (token: string) => `${APP_ORIGIN}/api/calendar/${token}.ics`;

interface FeedData { dbs: { id: string; prop?: string }[] }

function cleanDbs(userId: string, raw: unknown): FeedData["dbs"] {
  const arr = Array.isArray(raw) ? raw.slice(0, MAX_FEED_DBS) : [];
  const out: FeedData["dbs"] = [];
  for (const r of arr) {
    const id = typeof r?.id === "string" ? r.id : "";
    if (!id || !ownDatabase(userId, id)) continue;
    out.push({ id, prop: typeof r?.prop === "string" ? r.prop : undefined });
  }
  return out;
}

/** ICS 주소를 연 요청: 토큰 해시로 회원·표를 찾아 일정을 만든다(로그인 없이 구글이 읽는 주소) */
export function feedForToken(token: string): { userId: string; ics: string } | null {
  ensureCalendarTables();
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return null;
  const row = db.prepare("SELECT user_id, data FROM aww_cal_feeds WHERE token_hash = ?").get(hashToken(token)) as { user_id: string; data: string } | undefined;
  if (!row) return null;
  const data = JSON.parse(row.data) as FeedData;
  const events: CalEvent[] = [];
  for (const d of data.dbs) events.push(...databaseEvents(row.user_id, d.id, d.prop));
  return { userId: row.user_id, ics: buildIcs("AI 업무 워크스페이스", events) };
}

export const calendarHandlers: Record<string, Handler> = {
  /** 화면 처음: 날짜 칸 있는 표, 구독 상태, 구글 연결 상태 */
  async calState(ctx) {
    const userId = uid(ctx);
    ensureCalendarTables();
    const feed = db.prepare("SELECT data, updated_time FROM aww_cal_feeds WHERE user_id = ?").get(userId) as { data: string; updated_time: number } | undefined;
    const account = await loadGcalAccount(userId).catch(() => null);
    const app = await getGoogleApp(userId).catch(() => null);
    const settings = db.prepare("SELECT local_id FROM aww_gcal_links WHERE user_id = ? AND direction = 'push' LIMIT 1").get(userId);
    return {
      databases: listDateDatabases(userId),
      feed: feed ? { ...(JSON.parse(feed.data) as FeedData), updatedTime: feed.updated_time } : null,
      google: {
        hasApp: !!app,
        connected: !!account && !account.needsReconnect,
        needsReconnect: !!account?.needsReconnect,
        email: account?.username ?? null,
        redirectUri: GOOGLE_REDIRECT_URI,
        hasSent: !!settings,
      },
    };
  },

  /** ① 구독 주소 만들기·표 바꾸기. rotate면 새 주소(옛 주소 무효). 주소는 이때만 보여 줌(토큰 해시만 저장) */
  calFeedSave(ctx, { dbs, rotate }) {
    const userId = uid(ctx);
    ensureCalendarTables();
    const list = cleanDbs(userId, dbs);
    if (!list.length) throw new ApiError("구글 캘린더에 보여 줄 표를 하나 이상 골라 주세요.", 400);
    const cur = db.prepare("SELECT token_hash FROM aww_cal_feeds WHERE user_id = ?").get(userId) as { token_hash: string } | undefined;
    const data = JSON.stringify({ dbs: list } satisfies FeedData);
    if (cur && !rotate) {
      db.prepare("UPDATE aww_cal_feeds SET data = ?, updated_time = ? WHERE user_id = ?").run(data, Date.now(), userId);
      return { url: null, dbs: list };
    }
    const token = randomBytes(32).toString("base64url");
    if (cur) db.prepare("UPDATE aww_cal_feeds SET token_hash = ?, data = ?, updated_time = ? WHERE user_id = ?").run(hashToken(token), data, Date.now(), userId);
    else db.prepare("INSERT INTO aww_cal_feeds (user_id, token_hash, data, updated_time) VALUES (?, ?, ?, ?)").run(userId, hashToken(token), data, Date.now());
    return { url: feedUrl(token), dbs: list };
  },

  calFeedDelete(ctx) {
    const userId = uid(ctx);
    ensureCalendarTables();
    db.prepare("DELETE FROM aww_cal_feeds WHERE user_id = ?").run(userId);
    return { ok: true };
  },

  /** ② 표 행 → 구글 일정(만들기·고치기). 보낸 짝은 aww_gcal_links(push)에 남겨 다음엔 고침 */
  async calPushToGoogle(ctx, { dbId, prop }) {
    const userId = uid(ctx);
    ensureCalendarTables();
    if (typeof dbId !== "string" || !ownDatabase(userId, dbId)) throw new ApiError("표를 찾지 못했습니다.", 404);
    const events = databaseEvents(userId, dbId, typeof prop === "string" ? prop : undefined).slice(0, MAX_PUSH);
    if (!events.length) throw new ApiError("이 표에 날짜가 들어간 행이 없습니다.", 400);
    try {
      const token = await validToken(userId);
      let created = 0, updated = 0;
      for (const e of events) {
        const link = db.prepare("SELECT google_id FROM aww_gcal_links WHERE user_id = ? AND direction = 'push' AND local_id = ?").get(userId, e.rowId) as { google_id: string } | undefined;
        const gid = await upsertGoogleEvent(token, e, link?.google_id);
        if (link && link.google_id === gid) updated++;
        else created++;
        if (link) db.prepare("UPDATE aww_gcal_links SET google_id = ?, updated_time = ? WHERE user_id = ? AND direction = 'push' AND local_id = ?").run(gid, Date.now(), userId, e.rowId);
        else db.prepare("INSERT INTO aww_gcal_links (user_id, direction, local_id, google_id, updated_time) VALUES (?, 'push', ?, ?, ?)").run(userId, e.rowId, gid, Date.now());
      }
      return { created, updated, total: events.length };
    } catch (e) {
      if (e instanceof GcalError) throw new ApiError(e.message, e.code === "auth" ? 401 : e.code === "forbidden" ? 403 : 502);
      throw e;
    }
  },

  /** ② 구글 일정(앞으로 30일) 목록 */
  async calGoogleList(ctx) {
    const userId = uid(ctx);
    ensureCalendarTables();
    try {
      const items = await listGoogleEvents(await validToken(userId));
      const imported = new Set((db.prepare("SELECT local_id FROM aww_gcal_links WHERE user_id = ? AND direction = 'pull'").all(userId) as { local_id: string }[]).map((r) => r.local_id));
      return { items: items.map((x) => ({ ...x, imported: imported.has(x.id) })) };
    } catch (e) {
      if (e instanceof GcalError) throw new ApiError(e.message, e.code === "auth" ? 401 : e.code === "forbidden" ? 403 : 502);
      throw e;
    }
  },

  /** ② 구글 일정 → 고른 표에 행으로(이미 가져온 일정은 건너뜀). 열 이름: 이름·<날짜 칸 이름>·시간·장소·구글 일정 */
  async calPullFromGoogle(ctx, { dbId, prop }) {
    const userId = uid(ctx);
    ensureCalendarTables();
    const own = typeof dbId === "string" ? ownDatabase(userId, dbId) : null;
    if (!own) throw new ApiError("가져올 표를 골라 주세요.", 404);
    const propId = typeof prop === "string" && own.collection.schema?.[prop]?.type === "date" ? prop : Object.entries(own.collection.schema ?? {}).find(([, s]) => s.type === "date")?.[0];
    const dateName = propId ? own.collection.schema[propId].name : "날짜";
    let items;
    try {
      items = await listGoogleEvents(await validToken(userId));
    } catch (e) {
      if (e instanceof GcalError) throw new ApiError(e.message, e.code === "auth" ? 401 : e.code === "forbidden" ? 403 : 502);
      throw e;
    }
    const done = new Set((db.prepare("SELECT local_id FROM aww_gcal_links WHERE user_id = ? AND direction = 'pull'").all(userId) as { local_id: string }[]).map((r) => r.local_id));
    const fresh = items.filter((x) => !done.has(x.id) && x.date);
    if (!fresh.length) return { added: 0, skipped: items.length };
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [["이름", dateName, "시간", "장소", "구글 일정"].join(","), ...fresh.map((x) => [x.title, x.date, x.time, x.location, x.link].map(cell).join(","))].join("\n");
    const space = memberSpace(userId);
    const name = "구글일정.csv";
    const file = storeFile(name, csv, userId, space.id, "text/csv", { private: true });
    await extraHandlers.mergeCsv(ctx, { blockId: own.block.id, url: file.url, name });
    for (const x of fresh) db.prepare("INSERT INTO aww_gcal_links (user_id, direction, local_id, google_id, updated_time) VALUES (?, 'pull', ?, ?, ?)").run(userId, x.id, x.id, Date.now());
    return { added: fresh.length, skipped: items.length - fresh.length };
  },

  async calGoogleDisconnect(ctx) {
    const userId = uid(ctx);
    ensureCalendarTables();
    await disconnectGcal(userId);
    return { ok: true };
  },
};
