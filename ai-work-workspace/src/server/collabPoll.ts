// U13 협업 실시간(2026-11-11, 주인님 결정: 공유 페이지만 5초마다 확인 — 플랜 docs/PLAN_20261111_U13_COLLAB.md §2-4)
// 원본 웹소켓 대신: 브라우저가 열린 페이지로 collabPoll을 부르면 그 워크스페이스의 바뀐 레코드 중 보는 사람이 읽을 수 있는 것만 돌려준다.
// 함께 보는 사람(presence)은 워크스페이스 자체 표 aww_presence에 15초 동안 남긴다.
import "server-only";
import { db, getRecord, changesSince } from "@/litpage/server/db.ts";
import { blockRole, RecordMapBuilder } from "@/litpage/server/records.ts";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import type { BlockRecord, SpaceRecord } from "#shared/records.ts";

const PRESENCE_MS = 15_000;
let ready = false;
function ensureTable() {
  if (ready) return;
  db.exec(`CREATE TABLE IF NOT EXISTS aww_presence (page_id TEXT NOT NULL, user_id TEXT NOT NULL, client_id TEXT NOT NULL, seen INTEGER NOT NULL, data TEXT, PRIMARY KEY (page_id, client_id))`);
  ready = true;
}

/** 이 페이지를 나 말고 다른 사람도 쓸 수 있는가(워크스페이스 멤버 2명 이상, 또는 페이지·상위 페이지에 다른 사람 권한) */
export function isSharedPage(page: BlockRecord, userId: string): boolean {
  const space = getRecord<SpaceRecord>("space", String(page.space_id ?? ""));
  if ((space?.permissions ?? []).some((p) => p.user_id && p.user_id !== userId && p.role !== "none")) return true;
  let cur: BlockRecord | undefined = page;
  for (let i = 0; cur && i < 50; i++) {
    if ((cur.permissions ?? []).some((p: any) => p?.type === "user_permission" && p.user_id && p.user_id !== userId && p.role !== "none")) return true;
    if (cur.parent_table !== "block") break;
    cur = getRecord<BlockRecord>("block", String(cur.parent_id));
  }
  return false;
}

export const collabHandlers = {
  collabPoll(ctx: Ctx, { pageId, lsn, data }: { pageId?: unknown; lsn?: unknown; data?: unknown }) {
    const uid = ctx.userId;
    if (!uid) throw new ApiError("Unauthorized", 401);
    const page = getRecord<BlockRecord>("block", String(pageId ?? ""));
    if (!page || page.alive === false || blockRole(page.id, uid) === "none") throw new ApiError("Not found", 404);
    ensureTable();
    const now = Date.now();
    const clientId = String(ctx.clientId ?? uid).slice(0, 100);
    const presence = data && typeof data === "object" ? JSON.stringify(data).slice(0, 2000) : null;
    db.prepare("DELETE FROM aww_presence WHERE seen < ?").run(now - PRESENCE_MS);
    db.prepare("INSERT INTO aww_presence (page_id, user_id, client_id, seen, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT (page_id, client_id) DO UPDATE SET user_id = excluded.user_id, seen = excluded.seen, data = excluded.data").run(page.id, uid, clientId, now, presence);
    const viewers = (db.prepare("SELECT user_id, client_id, data FROM aww_presence WHERE page_id = ? AND seen >= ?").all(page.id, now - PRESENCE_MS) as { user_id: string; client_id: string; data: string | null }[])
      .map((v) => ({ userId: v.user_id, clientId: v.client_id, data: v.data ? JSON.parse(v.data) : null }));
    const shared = isSharedPage(page, uid);
    const spaceId = String(page.space_id ?? "");
    const since = Number(lsn) || 0;
    const rm = new RecordMapBuilder(uid);
    if (!since) {
      const row = db.prepare("SELECT MAX(lsn) AS m FROM changes WHERE space_id = ?").get(spaceId) as { m: number | null } | undefined;
      return { lsn: Number(row?.m ?? 0), shared, viewers, recordMap: rm.map };
    }
    const changes = changesSince([spaceId], since, 500);
    for (const c of changes) rm.add(c.tbl, getRecord(c.tbl, c.id));
    return { lsn: changes.length ? changes[changes.length - 1].lsn : since, shared, viewers, recordMap: rm.map };
  },
};
