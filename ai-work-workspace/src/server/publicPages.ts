// 공개 페이지 1단계(2026-11-14 주인님 「진행해」 권장안, 플랜 docs/PLAN_20261114_STORAGE_AND_PUBLIC.md B).
// 로그인 없는 방문자가 「웹에 게시」한 페이지를 읽기만 하게 한다. 원본 권한 규칙(공개 권한·만료·워크스페이스 공개 끄기)은 그대로 쓰고 그 위에:
//  · 허용 명령 4개만(getSite·getPublishedPage·loadPage·loadPageCached) — 그 밖은 모두 거절
//  · 「웹에 게시」(published)된 페이지와 그 아래만 — 링크 공유(게시 아님)는 열지 않음
//  · 관리자가 내린 페이지는 닫힘(aww_public_takedowns)
//  · 게시한 회원의 이용 기간이 끝나면 자동으로 닫힘(다시 이용하면 다시 열림)
//  · 「템플릿으로 복제」는 끔, 방문자 IP당 분당 120회
//  · 방문자 신고(aww_public_reports, IP당 시간당 5건) → 관리자 화면 /settings/public-pages
import "server-only";
import { createHash } from "node:crypto";
import type { BlockRecord, Permission } from "#shared/records.ts";
import { toPlainText } from "#shared/richtext.ts";
import { newId } from "#shared/ids.ts";
import { db, getRecord, withRequestCache } from "@/litpage/server/db.ts";
import { blockAncestors } from "@/litpage/server/api/modules/sharing.ts";
import { blockRole } from "@/litpage/server/records.ts";
import { hit } from "@/litpage/server/ratelimit.ts";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/access";
import { runPublicRpc, type RpcResult } from "./runtime";

export const PUBLIC_RPCS = new Set(["getSite", "getPublishedPage", "loadPage", "loadPageCached"]);
const NOT_FOUND: RpcResult = { status: 404, body: { name: "NotFound", message: "페이지를 찾을 수 없습니다." } };

let ready = false;
function ensureTables() {
  if (ready) return;
  db.exec("CREATE TABLE IF NOT EXISTS aww_public_takedowns (page_id TEXT PRIMARY KEY, reason TEXT, by_id TEXT, created_time BIGINT NOT NULL)");
  db.exec("CREATE TABLE IF NOT EXISTS aww_public_reports (id TEXT PRIMARY KEY, page_id TEXT NOT NULL, reason TEXT NOT NULL, ip_hash TEXT, created_time BIGINT NOT NULL)");
  ready = true;
}

const expand = (id: string) => {
  const h = id.replace(/-/g, "").toLowerCase();
  return /^[0-9a-f]{32}$/.test(h) ? `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` : "";
};
const livePublished = (p: Permission) => p.type === "public_permission" && !!p.published && p.role !== "none" && (!p.expiry_time || p.expiry_time > Date.now());

/** 이 페이지가 속한 「게시된」 맨 위 페이지와 게시한 회원(없으면 null) */
export function publishedRootOf(pageId: string): { rootId: string; ownerId: string } | null {
  ensureTables();
  const page = getRecord<BlockRecord>("block", pageId);
  if (!page || !page.alive) return null;
  for (const b of [page, ...blockAncestors(page)]) {
    const perm = (b.permissions ?? []).find(livePublished);
    if (perm) return { rootId: b.id, ownerId: String((perm as { published_by_id?: string }).published_by_id ?? (b as { created_by_id?: string }).created_by_id ?? "") };
  }
  return null;
}

// 게시한 회원의 이용 권한(5분 기억)
let ownerCheck: (userId: string) => Promise<boolean> = async (userId) =>
  (await checkProgramAccess(createAdminClient() as unknown as Parameters<typeof checkProgramAccess>[0], userId, THIS_PROGRAM_SLUG)).allowed;
const ownerCache = new Map<string, { ok: boolean; at: number }>();
async function ownerAllowed(userId: string): Promise<boolean> {
  if (!userId) return false;
  const c = ownerCache.get(userId);
  if (c && Date.now() - c.at < 5 * 60_000) return c.ok;
  const ok = await ownerCheck(userId).catch(() => false);
  ownerCache.set(userId, { ok, at: Date.now() });
  return ok;
}
/** 시험에서 바꿔 끼움 */
export function setPublicOwnerCheckForTests(fn: (userId: string) => Promise<boolean>) {
  ownerCheck = fn;
  ownerCache.clear();
}

function takenDown(rootId: string): boolean {
  return !!db.prepare("SELECT page_id FROM aww_public_takedowns WHERE page_id = ?").get(rootId);
}

/** 방문자에게 보여 줘도 되는 게시 페이지인가(게시됨 + 내리지 않음 + 게시한 회원 이용 중) */
export async function publicPageOpen(pageId: string): Promise<boolean> {
  const root = withRequestCache(() => {
    const r = publishedRootOf(pageId);
    return r && !takenDown(r.rootId) ? r : null;
  });
  return !!root && (await ownerAllowed(root.ownerId));
}

function pageIdOfRequest(name: string, body: Record<string, unknown>): string {
  if (name === "getSite") return expand(String(body.slugOrId ?? "")); // 사용자 주소(사이트 별칭)는 열지 않음 — 번호만
  if (name === "loadPageCached") return expand(String((body.page as { id?: unknown } | undefined)?.id ?? body.pageId ?? ""));
  return expand(String(body.pageId ?? ""));
}

const ipHash = (ip: string) => createHash("sha256").update(`aww-public:${ip}`).digest("hex").slice(0, 24);

/** /api/public/<명령> 처리 */
export async function handlePublicRpc(name: string, body: unknown, ip: string): Promise<RpcResult> {
  if (!hit(`aww-public-ip:${ip}`, 120, 60_000)) return { status: 429, body: { name: "RateLimitedError", message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." } };
  const input = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
  if (name === "awwReportPublicPage") return reportPublicPage(input, ip);
  if (!PUBLIC_RPCS.has(name)) return NOT_FOUND;
  const pageId = pageIdOfRequest(name, input);
  if (!pageId || !(await publicPageOpen(pageId))) return NOT_FOUND;
  const res = await runPublicRpc(name, name === "getSite" ? { slugOrId: pageId } : name === "loadPageCached" ? { pageId } : { ...input, pageId });
  if (res.status === 200 && name === "getPublishedPage") Object.assign(res.body as object, { allowDuplicate: false });
  return res;
}

/** 방문자 신고 */
async function reportPublicPage(input: Record<string, unknown>, ip: string): Promise<RpcResult> {
  const pageId = expand(String(input.pageId ?? ""));
  const reason = String(input.reason ?? "").trim().slice(0, 500);
  if (!pageId || !reason) return { status: 400, body: { name: "ValidationError", message: "신고 내용을 적어 주세요." } };
  if (!hit(`aww-public-report:${ip}`, 5, 3_600_000)) return { status: 429, body: { name: "RateLimitedError", message: "신고는 1시간에 5번까지 할 수 있습니다." } };
  const root = withRequestCache(() => publishedRootOf(pageId));
  if (!root) return NOT_FOUND;
  withRequestCache(() => {
    db.prepare("INSERT INTO aww_public_reports (id, page_id, reason, ip_hash, created_time) VALUES (?, ?, ?, ?, ?)").run(newId(), root.rootId, reason, ipHash(ip), Date.now());
  });
  return { status: 200, body: { ok: true } };
}

/** 로그인 없는 방문자의 파일 내려받기: 그 파일이 든 블록이 열린 게시 페이지 안에 있을 때만 */
export async function publicFileOpen(fileId: string): Promise<boolean> {
  if (!/^[\w-]{8,64}$/.test(fileId)) return false;
  const pages = withRequestCache(() => {
    const rows = db.prepare("SELECT id FROM records WHERE tbl = 'block' AND alive = 1 AND data LIKE ? LIMIT 20").all(`%${fileId}%`) as { id: string }[];
    return rows.filter((r) => blockRole(r.id, null) !== "none").map((r) => r.id);
  });
  for (const id of pages) if (await publicPageOpen(id)) return true;
  return false;
}

/** 검색엔진 색인 허용: 게시 + 회원이 「검색 엔진에 표시」를 켰을 때만(기본 noindex) */
export async function publicIndexing(pageId: string): Promise<{ open: boolean; index: boolean; title: string }> {
  const id = expand(pageId);
  if (!id || !(await publicPageOpen(id))) return { open: false, index: false, title: "" };
  return withRequestCache(() => {
    const root = publishedRootOf(id);
    const rb = root ? getRecord<BlockRecord>("block", root.rootId) : undefined;
    const perm = (rb?.permissions ?? []).find(livePublished) as { allow_search_engine_indexing?: boolean } | undefined;
    const page = getRecord<BlockRecord>("block", id);
    return { open: true, index: !!perm?.allow_search_engine_indexing, title: toPlainText((page?.properties as { title?: unknown } | undefined)?.title as never) };
  });
}

// ---------- 관리자(/settings/public-pages) ----------
export interface AdminPublicRow { pageId: string; title: string; ownerId: string; publishedTime: number | null; indexing: boolean; takenDown: boolean; reports: { reason: string; time: number }[] }

/** 게시된 페이지 전체 목록(최근 게시 순, 최대 500) + 신고 */
export function adminListPublicPages(): AdminPublicRow[] {
  ensureTables();
  return withRequestCache(() => {
    const rows = db.prepare(`SELECT data FROM records WHERE tbl = 'block' AND alive = 1 AND data LIKE '%"published":true%' LIMIT 2000`).all() as { data: string }[];
    const down = new Set((db.prepare("SELECT page_id FROM aww_public_takedowns").all() as { page_id: string }[]).map((r) => r.page_id));
    const reps = db.prepare("SELECT page_id, reason, created_time FROM aww_public_reports ORDER BY created_time DESC LIMIT 1000").all() as { page_id: string; reason: string; created_time: number }[];
    const out: AdminPublicRow[] = [];
    for (const r of rows) {
      const b = JSON.parse(r.data) as BlockRecord;
      const p = (b.permissions ?? []).find((x) => x.type === "public_permission" && x.published) as (Permission & { published_by_id?: string; published_time?: number; allow_search_engine_indexing?: boolean }) | undefined;
      if (!p) continue;
      out.push({
        pageId: b.id,
        title: toPlainText((b.properties as { title?: unknown } | undefined)?.title as never) || "(제목 없음)",
        ownerId: p.published_by_id ?? String((b as { created_by_id?: string }).created_by_id ?? ""),
        publishedTime: p.published_time ?? null,
        indexing: !!p.allow_search_engine_indexing,
        takenDown: down.has(b.id),
        reports: reps.filter((x) => x.page_id === b.id).slice(0, 20).map((x) => ({ reason: x.reason, time: Number(x.created_time) })),
      });
    }
    return out.sort((a, b) => (b.reports.length - a.reports.length) || ((b.publishedTime ?? 0) - (a.publishedTime ?? 0))).slice(0, 500);
  });
}

/** 관리자 내리기·다시 열기 */
export function adminSetTakedown(pageId: string, down: boolean, adminId: string, reason = ""): void {
  ensureTables();
  const id = expand(pageId);
  if (!id) throw new Error("페이지 번호가 올바르지 않습니다.");
  withRequestCache(() => {
    if (down) db.prepare("INSERT INTO aww_public_takedowns (page_id, reason, by_id, created_time) VALUES (?, ?, ?, ?) ON CONFLICT (page_id) DO UPDATE SET reason = excluded.reason, by_id = excluded.by_id, created_time = excluded.created_time").run(id, reason.slice(0, 300), adminId, Date.now());
    else db.prepare("DELETE FROM aww_public_takedowns WHERE page_id = ?").run(id);
  });
}
