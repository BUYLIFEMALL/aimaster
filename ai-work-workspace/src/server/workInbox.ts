// U7 업무 받은편지함(플랜 docs/PLAN_20261024_U7_WORK_INBOX.md): 공용 표 public.work_inbox를 읽어
// 「페이지로 만들기」·「표에 행으로 넣기」·「삭제」를 한다. 새 내부 로직을 만들지 않고 원본의
// 파일 가져오기(importFiles)·CSV 합치기(mergeCsv)를 그대로 불러 쓴다.
// - 회원 데이터 격리: 모든 조회·수정에 user_id = 로그인 회원(ctx.userId) 조건. 서버 키는 RLS를 건너뛰므로 조건을 빼먹지 않는다.
// - 30일 자동 삭제: runWorkInboxRetention()을 하루 1회 운영 정리 작업(/api/cron/jobs)에서 부른다.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import { extraHandlers } from "@/litpage/server/api/extra.ts";
import { getRecord, putRecord } from "@/litpage/server/db.ts";
import { storeFile } from "@/litpage/server/content/files.ts";
import { compactId } from "#shared/ids.ts";
import { inboxRowCsv } from "./workInboxCsv";
import { uncheckedTodos, pageAsTask, type PlannerTask } from "./workInboxPlannerItems";
import { sendToWorkInbox } from "@/lib/workInbox";
import type { BlockRecord, CollectionRecord, SpaceRecord, SpaceViewRecord, UserRootRecord, UserSettingsRecord } from "#shared/records.ts";

const APP_ORIGIN = "https://ai-work-workspace.buylife.xyz";

export const WORK_INBOX_RETENTION_DAYS = 30;
const SETTINGS_KEY = "aww_work_inbox_db"; // 「📨 받은 업무 표」 데이터베이스 블록 id(회원 설정에 저장)
const INBOX_DB_TITLE = "📨 받은 업무 표";
const TARGET = "ai-work-workspace"; // U8-B: 받는 곳이 워크스페이스인 줄만 이 화면에서 다룬다

export interface WorkInboxRow {
  id: string;
  source_slug: string;
  kind: string;
  title: string;
  body_md: string;
  data: Record<string, unknown>;
  source_url: string | null;
  created_at: string;
  imported_at: string | null;
  imported_ref: string | null;
}

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;

function uid(ctx: Ctx): string {
  if (!ctx.userId) throw new ApiError("Unauthorized", 401);
  return ctx.userId;
}

/** 회원이 쓰는 워크스페이스(처음 연결된 것) */
function memberSpace(userId: string): SpaceRecord {
  const root = getRecord<UserRootRecord>("user_root", userId);
  for (const id of root?.space_views ?? []) {
    const sv = getRecord<SpaceViewRecord>("space_view", id);
    if (!sv || sv.alive === false) continue;
    const space = getRecord<SpaceRecord>("space", sv.space_id);
    if (space && space.alive !== false) return space;
  }
  throw new ApiError("워크스페이스를 찾지 못했습니다. 워크스페이스를 먼저 열어 주세요.", 404);
}

/** 회원이 연결된 모든 워크스페이스 id */
function memberSpaceIds(userId: string): Set<string> {
  const root = getRecord<UserRootRecord>("user_root", userId);
  const ids = new Set<string>();
  for (const id of root?.space_views ?? []) {
    const sv = getRecord<SpaceViewRecord>("space_view", id);
    if (sv && sv.alive !== false) ids.add(sv.space_id);
  }
  return ids;
}

async function loadRow(userId: string, id: unknown): Promise<WorkInboxRow> {
  const { data, error } = await createAdminClient()
    .from("work_inbox")
    .select("id, source_slug, kind, title, body_md, data, source_url, created_at, imported_at, imported_ref")
    .eq("user_id", userId).eq("target_slug", TARGET)
    .eq("id", String(id ?? ""))
    .maybeSingle();
  if (error) throw new ApiError("받은 업무를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  if (!data) throw new ApiError("이 항목을 찾지 못했습니다. 이미 지웠거나 30일이 지나 정리됐을 수 있습니다.", 404);
  return data as WorkInboxRow;
}

async function markImported(userId: string, id: string, ref: string) {
  await createAdminClient().from("work_inbox").update({ imported_at: new Date().toISOString(), imported_ref: ref }).eq("user_id", userId).eq("target_slug", TARGET).eq("id", id);
}

function pageUrl(space: SpaceRecord, pageId: string): string {
  return `/${space.domain}/${compactId(pageId)}`;
}

/** 파일 이름에 쓸 수 없는 글자를 뺀 제목 */
function fileSafe(title: string): string {
  return title.replace(/[\\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 80) || "받은 업무";
}

/** 이식판에서 추가하는 명령(runtime OVERRIDES에 합침) */
export const workInboxHandlers: Record<string, Handler> = {
  /** 목록(최근 100개) + 안 가져간 수 */
  async workInboxList(ctx) {
    const userId = uid(ctx);
    const { data, error } = await createAdminClient()
      .from("work_inbox")
      .select("id, source_slug, kind, title, body_md, data, source_url, created_at, imported_at, imported_ref")
      .eq("user_id", userId).eq("target_slug", TARGET)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new ApiError("받은 업무를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
    const rows = (data ?? []) as WorkInboxRow[];
    let space: SpaceRecord | null = null;
    try {
      space = memberSpace(userId);
    } catch {
      space = null;
    }
    return {
      items: rows.map((r) => ({ ...r, imported_url: r.imported_ref && space ? pageUrl(space, r.imported_ref) : null })),
      unread: rows.filter((r) => !r.imported_at).length,
    };
  },

  /** 「페이지로 만들기」: 본문 마크다운을 「내 페이지」 맨 위에 새 페이지로(원본 importFiles 재사용) */
  async workInboxImportPage(ctx, { id }) {
    const userId = uid(ctx);
    const row = await loadRow(userId, id);
    const space = memberSpace(userId);
    const md = `# ${row.title}\n\n${row.body_md || ""}${row.source_url ? `\n\n---\n원본: ${row.source_url}` : ""}\n`;
    const name = `${fileSafe(row.title)}.md`;
    const file = storeFile(name, md, userId, space.id, "text/markdown", { private: true });
    const r = await extraHandlers.importFiles(ctx, { spaceId: space.id, files: [{ name, url: file.url }] });
    const pageId = r?.pageIds?.[0] as string | undefined;
    if (!pageId) throw new ApiError("페이지를 만들지 못했습니다. 다시 시도해 주세요.", 500);
    await markImported(userId, row.id, pageId);
    return { pageId, url: pageUrl(space, pageId), recordMap: r.recordMap };
  },

  /** 「표에 행으로 넣기」: 「📨 받은 업무 표」(없으면 「내 페이지」에 새로 만듦)에 한 줄 추가 */
  async workInboxImportRow(ctx, { id }) {
    const userId = uid(ctx);
    const row = await loadRow(userId, id);
    const space = memberSpace(userId);
    const csv = inboxRowCsv(row);
    const settings = getRecord<UserSettingsRecord>("user_settings", userId);
    const savedId = (settings?.settings as Record<string, unknown> | undefined)?.[SETTINGS_KEY];
    const saved = typeof savedId === "string" ? getRecord<BlockRecord>("block", savedId) : undefined;
    let dbId: string;
    let recordMap: unknown;
    if (saved && saved.alive !== false && saved.space_id === space.id && saved.type === "collection_view_page") {
      const name = "받은업무.csv";
      const file = storeFile(name, csv, userId, space.id, "text/csv", { private: true });
      const r = await extraHandlers.mergeCsv(ctx, { blockId: saved.id, url: file.url, name });
      dbId = saved.id;
      recordMap = r?.recordMap;
    } else {
      const name = `${INBOX_DB_TITLE}.csv`;
      const file = storeFile(name, csv, userId, space.id, "text/csv", { private: true });
      const r = await extraHandlers.importFiles(ctx, { spaceId: space.id, files: [{ name, url: file.url }], csvTypes: { 1: "select", 2: "select", 3: "date", 4: "url" } });
      dbId = r?.pageIds?.[0];
      if (!dbId) throw new ApiError("표를 만들지 못했습니다. 다시 시도해 주세요.", 500);
      recordMap = r.recordMap;
      if (settings) {
        putRecord("user_settings", {
          ...settings,
          version: (settings.version ?? 0) + 1,
          settings: { ...settings.settings, [SETTINGS_KEY]: dbId },
        } as UserSettingsRecord);
      }
    }
    await markImported(userId, row.id, dbId);
    return { pageId: dbId, url: pageUrl(space, dbId), recordMap };
  },

  /** U8-B 「할 일 플래너로 보내기」: mode "todos" = 체크 안 된 할 일 항목들, "page" = 이 페이지를 할 일 하나로. 회원 본인 공간의 페이지만 */
  async workInboxSendToPlanner(ctx, { pageId, mode }) {
    const userId = uid(ctx);
    const page = getRecord<BlockRecord>("block", String(pageId ?? ""));
    if (!page || page.alive === false || !memberSpaceIds(userId).has(page.space_id)) throw new ApiError("보낼 페이지를 찾지 못했습니다.", 404);
    const tasks: PlannerTask[] = mode === "page"
      ? [pageAsTask(page, page.parent_table === "collection" ? getRecord<CollectionRecord>("collection", page.parent_id) : undefined)]
      : uncheckedTodos((id) => getRecord<BlockRecord>("block", id), page).map((title) => ({ title, data: {} }));
    if (!tasks.length) throw new ApiError("이 페이지에 체크하지 않은 할 일 항목이 없습니다.", 400);
    const space = memberSpace(userId);
    const sourceUrl = `${APP_ORIGIN}${pageUrl(space, page.id)}`;
    const pageTitle = (page.properties?.title ?? []).map((d) => d[0]).join("").trim() || "제목 없는 페이지";
    for (const t of tasks) {
      await sendToWorkInbox({ userId, sourceSlug: "ai-work-workspace", targetSlug: "ai-task-planner", kind: "task", title: t.title, bodyMd: `업무 워크스페이스 「${pageTitle}」에서 보냄`, data: t.data, sourceUrl })
        .catch((e) => { throw new ApiError(e instanceof Error ? e.message : "할 일 플래너로 보내지 못했습니다.", 502); });
    }
    return { count: tasks.length, plannerUrl: "https://ai-task-planner.buylife.xyz/dashboard" };
  },

  /** 삭제(본인 줄만) */
  async workInboxDelete(ctx, { id }) {
    const userId = uid(ctx);
    const { error } = await createAdminClient().from("work_inbox").delete().eq("user_id", userId).eq("target_slug", TARGET).eq("id", String(id ?? ""));
    if (error) throw new ApiError("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
    return { ok: true };
  },
};

/** 30일 자동 삭제(운영 정리 작업) — 생성 30일 지난 받은편지함 줄. 가져가 만든 페이지·표 행은 남는다. */
export async function runWorkInboxRetention(now = Date.now()): Promise<{ deleted: number }> {
  const cutoff = new Date(now - WORK_INBOX_RETENTION_DAYS * 86_400_000).toISOString();
  const { data, error } = await createAdminClient().from("work_inbox").delete().lt("created_at", cutoff).select("id");
  if (error) throw new Error(`work_inbox retention failed: ${error.message}`);
  return { deleted: data?.length ?? 0 };
}
