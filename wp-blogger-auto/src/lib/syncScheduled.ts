import "server-only";
// 예약 확인(2026-11-11 주인님 결정 3) — 예약 시각이 지난 글을 회원 본인 블로그 연결로 「읽기만」 해서
// 실제로 공개됐으면 「발행됨」으로 바꾸고, 원고·이미지·기록을 그때부터 1년 보관한다(v1.04).
// 확인이 안 되면 그대로 두고 다음 날 다시 본다(자동 재발행·재전송 없음). 회원별로 실패를 격리한다.
import { loadWordpressConnection, safeFetchImpl } from "./wordpressConnect";
import { getValidBloggerToken } from "./googleConnect";
import { getPostStatus as wpGetStatus, type WpDeps } from "./publish/wordpress";
import { getPostStatus as blGetStatus } from "./publish/blogger";
import { retentionPatch } from "./publishFlow";
import type { PublishResult } from "./publish/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any };
type Row = { id: string; user_id: string; platform: "wordpress" | "blogger"; remote_id: string; scheduled_at: string | null; images: { status?: string; path?: string }[] | null };
type Deps = {
  now?: number;
  /** 시험용: 플랫폼 읽기를 바꿔 끼움 */
  read?: (admin: AdminDb, row: Row) => Promise<PublishResult>;
  budgetMs?: number;
};

const GRACE_MS = 5 * 60_000;
const BATCH = 100;

async function readRemote(admin: AdminDb, row: Row): Promise<PublishResult> {
  if (row.platform === "wordpress") {
    const conn = await loadWordpressConnection(admin as never, row.user_id);
    if (!conn) throw new Error("not_connected");
    return wpGetStatus(conn, row.remote_id, { fetchImpl: safeFetchImpl } as WpDeps);
  }
  const { token, account } = await getValidBloggerToken(admin as never, row.user_id);
  return blGetStatus(token, String((account.extra as { blog_id?: string }).blog_id ?? ""), row.remote_id);
}

export async function syncScheduled(admin: AdminDb, deps: Deps = {}) {
  const now = deps.now ?? Date.now();
  const started = Date.now();
  const budget = deps.budgetMs ?? 200_000;
  const cutoff = new Date(now - GRACE_MS).toISOString();
  const { data, error } = await admin.from("wba_posts")
    .select("id, user_id, platform, remote_id, scheduled_at, images")
    .eq("status", "scheduled").not("remote_id", "is", null).lt("scheduled_at", cutoff)
    .order("scheduled_at", { ascending: true }).limit(BATCH);
  if (error) throw new Error("sync_query_failed");
  const rows = (Array.isArray(data) ? data : []) as Row[];
  const out = { checked: 0, confirmed: 0, pending: 0, failed: 0 };
  for (const row of rows) {
    if (Date.now() - started > budget) break;
    out.checked++;
    try {
      const r = await (deps.read ?? readRemote)(admin, row);
      if (r.status !== "published") { out.pending++; continue; }
      const publishedAt = r.publishedAt || row.scheduled_at || new Date(now).toISOString();
      const imageCount = (row.images ?? []).filter((i) => i?.status === "done" && i?.path).length;
      await admin.from("wba_posts")
        .update({ status: "published", published_at: publishedAt, ...(r.url ? { remote_url: r.url } : {}), ...retentionPatch(row.platform, "published", imageCount, publishedAt), updated_at: new Date(now).toISOString() })
        .eq("id", row.id).eq("user_id", row.user_id).eq("status", "scheduled");
      out.confirmed++;
    } catch {
      out.failed++; // 연결 끊김·토큰 만료 등 — 그대로 두고 다음 날 다시
    }
  }
  return out;
}
