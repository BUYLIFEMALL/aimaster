import "server-only";
import { createAdminClient } from "@/lib/cardnews/supabase/admin";
import { checkProgramAccess } from "@/lib/cardnews/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/cardnews/access";
import { getMemberInstagramAccount } from "./memberAccount";
import { graphBaseFor, publishInstagramCarousel, publishInstagramPost } from "@/lib/instagram/publish";
import { findSameRecentPost, isTooLate, isTransientPublishError, RETRY_DELAY_MS, TOO_LATE_MESSAGE, type RecentMedia } from "@/lib/cardnews/schedule";

// 인스타 게시 기록·예약 게시(v1.19). 즉시 게시와 예약 실행이 같은 함수(publishPaths)를 쓴다.
// 게시 기록 표 cns_insta_posts — 회원 본인만 읽기(RLS), 쓰기는 이 서버 코드만. 생성 30일 뒤 삭제(cleanupOldPosts).

export const BUCKET = "cardnews-images";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const STUCK_MS = 30 * 60 * 1000;

export function validPaths(userId: string, paths: string[]): boolean {
  const prefix = `${userId}/insta/`;
  return paths.length >= 1 && paths.length <= 10 && paths.every((p) => p.startsWith(prefix) && !p.includes("..") && /\.jpg$/.test(p));
}

export function removeImages(paths: string[]) {
  if (!paths.length) return Promise.resolve();
  return createAdminClient().storage.from(BUCKET).remove(paths).then(() => undefined).catch(() => undefined);
}

export type PublishOutcome = { ok: true; permalink: string; username: string } | { ok: false; error: string; needConnect?: boolean };

/** 회원 본인 연결값(공용 insta_accounts)으로 이미지 경로들을 게시한다. 이미지 삭제는 호출부가 한다. */
export async function publishPaths(userId: string, paths: string[], caption: string): Promise<PublishOutcome> {
  const account = await getMemberInstagramAccount(userId);
  if (!account) return { ok: false, error: "연결된 인스타그램 계정이 없습니다. 「API키등록·플랫폼연동」에서 한 번 연결하면 바로 쓸 수 있어요.", needConnect: true };
  if (account.expired) return { ok: false, error: "인스타그램 연결이 만료되었습니다. 「API키등록·플랫폼연동」에서 다시 연결해 주세요.", needConnect: true };
  const storage = createAdminClient().storage.from(BUCKET);
  const imageUrls = paths.map((p) => storage.getPublicUrl(p).data.publicUrl);
  try {
    const base = { graphBase: graphBaseFor(account.authMethod), accessToken: account.accessToken, igUserId: account.igUserId, caption };
    const result = imageUrls.length === 1 ? await publishInstagramPost({ ...base, imageUrl: imageUrls[0] }) : await publishInstagramCarousel({ ...base, imageUrls });
    return { ok: true, permalink: result.permalink, username: account.username };
  } catch (err) {
    const msg = String((err as Error)?.message ?? "").split(account.accessToken).join("***").slice(0, 300);
    return { ok: false, error: `인스타그램 게시에 실패했습니다. ${msg}` };
  }
}

/** 회원 본인 계정의 최근 게시물(최대 10개). 조회 실패는 null — 호출부는 그때 평소대로 진행한다(v1.21) */
export async function fetchRecentMedia(userId: string): Promise<RecentMedia[] | null> {
  const account = await getMemberInstagramAccount(userId);
  if (!account || account.expired) return null;
  try {
    const url = `${graphBaseFor(account.authMethod)}/${account.igUserId}/media?fields=caption,timestamp,permalink&limit=10&access_token=${encodeURIComponent(account.accessToken)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: RecentMedia[] };
    return Array.isArray(body.data) ? body.data : null;
  } catch {
    return null;
  }
}

/** 게시된 기록에 남기는 안내 — 응답은 실패였지만 인스타에 이미 올라간 것을 확인해 다시 올리지 않은 경우(v1.23, 게시됨 기록의 error_message는 원래 비어 있어 안내 칸으로 쓴다) */
export const ALREADY_POSTED_NOTE = "응답이 늦었지만 인스타그램에 이미 올라간 것을 확인해 다시 올리지 않았습니다.";

export interface PostRecordInput {
  userId: string;
  projectId: string | null;
  title: string;
  paths: string[];
  caption: string;
}

/** 프로젝트 id가 이 회원 것일 때만 남긴다(다른 회원 프로젝트 연결 방지) */
export async function ownProjectId(userId: string, projectId: unknown): Promise<string | null> {
  if (typeof projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(projectId)) return null;
  const { data } = await createAdminClient().from("cns_projects").select("id").eq("id", projectId).eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

export async function insertPost(rec: PostRecordInput, fields: Record<string, unknown>) {
  const { data, error } = await createAdminClient()
    .from("cns_insta_posts")
    .insert({ user_id: rec.userId, project_id: rec.projectId, title: rec.title.slice(0, 120), image_paths: rec.paths, page_count: rec.paths.length, caption: rec.caption, ...fields })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export interface DispatchOptions {
  /** 이 회원의 글만(회원 cron-job.org 실행, v1.24) */
  userId?: string;
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원(v1.24) */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트에서 운영자 실행이 Vercel 회원 글을 만나면 게시하지 않고 이 안내로 실패 처리(v1.24) */
  failWithMessage?: string;
}

/** 예약 시각이 지난 글을 한 건씩 잠그고(scheduled→publishing) 게시한다. 같은 글이 두 번 올라가지 않게 조건부로 잠근다. */
export async function dispatchDuePosts(limit = 10, options: DispatchOptions = {}): Promise<{ id: string; status: string }[]> {
  const admin = createAdminClient();
  let query = admin
    .from("cns_insta_posts")
    .select("id, user_id, image_paths, caption, error_message, updated_at, scheduled_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: due } = await query.order("scheduled_at", { ascending: true }).limit(limit);
  const results: { id: string; status: string }[] = [];
  for (const post of due ?? []) {
    const { data: claimed } = await admin
      .from("cns_insta_posts")
      .update({ status: "publishing", updated_at: new Date().toISOString() })
      .eq("id", post.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (!claimed) continue; // 다른 실행이 먼저 가져감
    const finish = (fields: Record<string, unknown>) => admin.from("cns_insta_posts").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", post.id);
    // 실행 방식이 준비 안 됐거나(failWithMessage) 24시간 넘게 밀린 예약은 올리지 않는다(v1.24)
    const skipMessage = options.failWithMessage ?? (isTooLate(post.scheduled_at) ? TOO_LATE_MESSAGE : null);
    if (skipMessage) {
      await finish({ status: "failed", error_message: skipMessage });
      await removeImages(post.image_paths ?? []);
      results.push({ id: post.id, status: "failed" });
      continue;
    }
    const access = await checkProgramAccess(admin, post.user_id, THIS_PROGRAM_SLUG);
    if (!access.allowed) {
      await finish({ status: "failed", error_message: "예약 시각에 프로그램 이용 권한(또는 핸드폰 등록)이 확인되지 않아 게시하지 않았습니다." });
      await removeImages(post.image_paths ?? []);
      results.push({ id: post.id, status: "failed" });
      continue;
    }
    // 다시 시도하는 차례면, 1차 시도가 실제로는 올라갔는데 응답만 늦었던 경우를 먼저 확인해 중복 게시를 막는다(v1.21)
    if (post.error_message) {
      const same = findSameRecentPost((await fetchRecentMedia(post.user_id)) ?? [], post.caption ?? "", Date.now(), post.updated_at ? Date.parse(post.updated_at) : undefined);
      if (same) {
        await finish({ status: "published", published_at: same.timestamp ? new Date(same.timestamp).toISOString() : new Date().toISOString(), permalink: same.permalink ?? null, error_message: ALREADY_POSTED_NOTE });
        await removeImages(post.image_paths ?? []);
        results.push({ id: post.id, status: "already_published" });
        continue;
      }
    }
    const out = await publishPaths(post.user_id, post.image_paths ?? [], post.caption ?? "");
    // 일시 오류는 한 번만 10분 뒤 다시 시도(v1.20). 예약 상태로 되돌리고 실패 사유를 남겨 두면, 그 사유가 「이미 한 번 다시 시도했다」는 표시가 된다(이미지는 보관).
    if (!out.ok && !out.needConnect && !post.error_message && isTransientPublishError(out.error)) {
      await finish({ status: "scheduled", scheduled_at: new Date(Date.now() + RETRY_DELAY_MS).toISOString(), error_message: `1차 실패 — 10분 뒤 한 번 더 시도합니다. ${out.error}`.slice(0, 400) });
      results.push({ id: post.id, status: "retry" });
      continue;
    }
    await finish(out.ok ? { status: "published", published_at: new Date().toISOString(), permalink: out.permalink, ig_username: out.username, error_message: null } : { status: "failed", error_message: out.error });
    await removeImages(post.image_paths ?? []);
    results.push({ id: post.id, status: out.ok ? "published" : "failed" });
  }
  return results;
}

/** 30일 지난 기록·남은 이미지 정리, 30분 넘게 「게시 중」에 멈춘 글은 실패 처리 */
export async function cleanupOldPosts(): Promise<{ deleted: number; unstuck: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const { data: old } = await admin.from("cns_insta_posts").select("id, image_paths").lt("created_at", cutoff).limit(200);
  for (const o of old ?? []) await removeImages(o.image_paths ?? []);
  if (old?.length) await admin.from("cns_insta_posts").delete().in("id", old.map((o) => o.id));
  const { data: stuck } = await admin
    .from("cns_insta_posts")
    .update({ status: "failed", error_message: "게시 처리가 너무 오래 걸려 중단했습니다. 인스타그램에서 올라갔는지 확인한 뒤 다시 시도해 주세요.", updated_at: new Date().toISOString() })
    .eq("status", "publishing")
    .lt("updated_at", new Date(Date.now() - STUCK_MS).toISOString())
    .select("id");
  return { deleted: old?.length ?? 0, unstuck: stuck?.length ?? 0 };
}
