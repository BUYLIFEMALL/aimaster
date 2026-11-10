import "server-only";
// 발행(2-5) — 블로그 핵심 지침: 웹에서 완성한 원고를 회원이 고른 방식(발행 전까지=초안 / 바로 발행 / 예약)으로만 올리고,
// 결과(글 주소·예약 시각·실패 사유)를 기록하며, 결과가 불확실하면 자동으로 다시 올리지 않는다.
// 회원 본인 원고·본인 블로그 연결만(서버 키라 user_id 조건 필수).
import { InputError, EDITABLE } from "./draft/service";
import { loadWordpressConnection, safeFetchImpl } from "./wordpressConnect";
import { getValidBloggerToken } from "./googleConnect";
import { uploadMedia, resolveTagIds, createPost as wpCreate, cancelSchedule as wpCancel, setPostStatus as wpSetStatus, type WpDeps } from "./publish/wordpress";
import { createPost as blCreate, revertToDraft as blRevert, publishExisting as blPublishExisting } from "./publish/blogger";
import { PublishError, type PublishMode, type PublishResult } from "./publish/types";
import { figureHtml } from "./image/html";
import { BUCKET, type ImageEntry } from "./image/service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any; storage: { from: (bucket: string) => any } };
type Deps = { wp?: WpDeps; blogger?: { fetchImpl?: WpDeps["fetchImpl"]; now?: () => number }; now?: () => number };

export type PublishRequest = { mode: PublishMode; scheduledAt?: string; categoryIds?: number[] };

/** 이미지를 남길 글: 구글 블로그에 「실제 발행된」 글만(우리 저장소 이미지를 본문이 그대로 씀).
 *  예약 대기·초안은 미발행이라 30일 규칙(주인님 2026-11-11 「발행된 콘텐츠관련된 이미지와 파일만 보관」). 워드프레스는 사이트에 복사되므로 남기지 않음 */
export function keepPublishedImages(platform: string, status: string, imageCount: number) {
  return platform === "blogger" && imageCount > 0 && status === "published";
}

export const PUBLISHED_IMAGE_KEEP_MS = 365 * 24 * 3600_000;
/** 발행 이미지 보관 끝(발행일 + 1년) */
export function imageExpiresAt(publishedAtIso: string) {
  return new Date(Date.parse(publishedAtIso) + PUBLISHED_IMAGE_KEEP_MS).toISOString();
}

/** 보관 칸 묶음 — 실제 발행일 때만 1년, 아니면 해제 */
export function retentionPatch(platform: string, status: string, imageCount: number, publishedAtIso: string | null) {
  const keep = keepPublishedImages(platform, status, imageCount) && !!publishedAtIso;
  return { keep_images: keep, image_expires_at: keep ? imageExpiresAt(publishedAtIso!) : null };
}

export const SCHEDULE_MARGIN_MS = 24 * 3600_000;
/** 예약 시각 제한: 발행 전 원고는 expires_at(만든 날+30일)에 이미지와 함께 지워지므로 그 하루 전까지만 */
export function checkScheduleWithinRetention(scheduledAtIso: string | undefined, expiresAtIso: string | null) {
  if (!scheduledAtIso || !expiresAtIso) return;
  const limit = Date.parse(expiresAtIso) - SCHEDULE_MARGIN_MS;
  if (Date.parse(scheduledAtIso) > limit) {
    const kst = new Date(limit + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
    throw new InputError(`예약은 ${kst}(한국 시간)까지만 할 수 있습니다. 발행 전 원고는 만든 날부터 30일 뒤 이미지와 함께 지워져, 그보다 늦게 공개되면 이미지가 깨집니다.`, 400, "schedule_too_late");
  }
}

export function parsePublishRequest(body: unknown): PublishRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  const mode = b.mode === "publish" || b.mode === "schedule" || b.mode === "draft" ? b.mode : null;
  if (!mode) throw new InputError("발행 방식을 골라 주세요(발행 전까지·바로 발행·예약).");
  const categoryIds = Array.isArray(b.categoryIds) ? b.categoryIds.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 10) : [];
  return { mode, scheduledAt: typeof b.scheduledAt === "string" ? b.scheduledAt : undefined, categoryIds };
}

type Row = { id: string; platform: "wordpress" | "blogger"; status: string; title: string; html: string; excerpt: string | null; slug: string | null; tags: string[]; images: ImageEntry[]; remote_id: string | null; expires_at: string | null };

async function setRow(admin: AdminDb, userId: string, id: string, patch: Record<string, unknown>) {
  await admin.from("wba_posts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
}

async function imageBytes(admin: AdminDb, path: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) throw new PublishError("server", "저장해 둔 이미지를 읽지 못했습니다. 이미지를 다시 만들어 주세요.");
  return { bytes: new Uint8Array(await data.arrayBuffer()), mime: data.type || "image/jpeg" };
}

export async function publishPost(admin: AdminDb, userId: string, postId: string, req: PublishRequest, deps: Deps = {}) {
  const { data } = await admin.from("wba_posts").select("id, platform, status, title, html, excerpt, slug, tags, images, remote_id, expires_at").eq("id", postId).eq("user_id", userId).maybeSingle();
  const post = data as Row | null;
  if (!post) throw new InputError("원고를 찾지 못했습니다.", 404, "not_found");
  if (req.mode === "schedule") checkScheduleWithinRetention(req.scheduledAt, post.expires_at);
  // 블로그에 초안으로 올라가 있는 원고 → 새 글을 만들지 않고 같은 글을 발행·예약으로 전환(중복 방지)
  if (post.remote_id && post.status === "draft" && req.mode !== "draft") return switchDraft(admin, userId, post, req, deps);
  if (post.remote_id) throw new InputError("이미 블로그에 올라간 원고입니다. 중복을 막기 위해 다시 보내지 않습니다 — 블로그 관리 화면에서 이어서 처리해 주세요.", 409, "already_sent");
  if (!EDITABLE.includes(post.status)) throw new InputError("지금은 발행할 수 없는 상태입니다.", 409, "locked");
  const prevStatus = post.status;

  // 잠그기: 같은 원고를 두 번 보내지 않게(조건부로 publishing 전환)
  const { data: locked } = await admin.from("wba_posts").update({ status: "publishing", mode: req.mode, error_code: null, error_detail: null, updated_at: new Date().toISOString() })
    .eq("id", postId).eq("user_id", userId).eq("status", prevStatus).is("remote_id", null).select("id");
  if (!Array.isArray(locked) || locked.length !== 1) throw new InputError("이미 발행을 진행 중입니다.", 409, "busy");

  let sent = false;
  let blogRef: string | null = null; // 글 만들기 요청을 보냈는가(보낸 뒤 실패는 불확실로 취급)
  try {
    const images = (post.images ?? []).filter((i) => i.status === "done" && i.path && i.url);
    let html = post.html;
    let result: PublishResult;
    if (post.platform === "wordpress") {
      const conn = await loadWordpressConnection(admin, userId);
      if (!conn) throw new PublishError("auth", "워드프레스가 연결돼 있지 않습니다. 「블로그 연결」에서 먼저 연결해 주세요.");
      blogRef = conn.siteUrl;
      const wpDeps: WpDeps = deps.wp ?? { fetchImpl: safeFetchImpl };
      let featuredMediaId: number | undefined;
      for (const img of images) {
        const file = await imageBytes(admin, img.path!);
        const ext = file.mime.includes("png") ? "png" : file.mime.includes("webp") ? "webp" : "jpg";
        const media = await uploadMedia(conn, { ...file, filename: `${post.slug || "post"}-${img.slot}.${ext}` }, wpDeps);
        if (img.slot === "featured") featuredMediaId = media.id;
        else html = html.split(img.url!).join(media.url);
      }
      const tagIds = post.tags.length ? await resolveTagIds(conn, post.tags, wpDeps) : [];
      sent = true;
      result = await wpCreate(conn, { title: post.title, html, mode: req.mode, scheduledAt: req.scheduledAt, excerpt: post.excerpt ?? undefined, slug: post.slug ?? undefined, tagIds, categoryIds: req.categoryIds, featuredMediaId }, wpDeps);
    } else {
      const { token, account } = await getValidBloggerToken(admin, userId, deps.blogger);
      const blogId = (account.extra as { blog_id?: string }).blog_id;
      if (!blogId) throw new PublishError("bad_request", "올릴 구글 블로그를 먼저 골라 주세요(「블로그 연결」).");
      blogRef = blogId;
      const featured = images.find((i) => i.slot === "featured");
      if (featured) html = figureHtml(featured.url!, featured.alt) + html;
      sent = true;
      result = await blCreate(token, blogId, { title: post.title, html, mode: req.mode, scheduledAt: req.scheduledAt, tags: post.tags }, deps.blogger);
    }
    const publishedAt = result.status === "published" ? new Date((deps.now ?? Date.now)()).toISOString() : null;
    await setRow(admin, userId, postId, {
      status: result.status,
      remote_id: result.remoteId,
      remote_url: result.url,
      scheduled_at: result.scheduledAt,
      published_at: publishedAt,
      blog_ref: blogRef,
      // 구글 블로그에 실제 발행된 글의 이미지만 발행일부터 1년 보관(TOP_RULE §8)
      ...retentionPatch(post.platform, result.status, images.length, publishedAt),
    });
    return { ...result, platform: post.platform };
  } catch (e) {
    const pe = e instanceof PublishError ? e : new PublishError(sent ? "uncertain" : "server", "발행 중 알 수 없는 오류가 났습니다.");
    if (pe.partial) {
      // 구글 블로그: 초안은 저장됐지만 예약을 못 건 경우 — 초안으로 기록(다시 보내면 중복)
      await setRow(admin, userId, postId, { status: "draft", remote_id: pe.partial.remoteId, remote_url: pe.partial.url, keep_images: false, image_expires_at: null, error_code: pe.code, error_detail: pe.message.slice(0, 400) });
    } else if (pe.code === "uncertain") {
      await setRow(admin, userId, postId, { status: "uncertain", error_code: pe.code, error_detail: pe.message.slice(0, 400), keep_images: false, image_expires_at: null });
    } else {
      // 보내기 전 실패·상대가 명확히 거절 → 원래 상태로(다시 시도 가능)
      await setRow(admin, userId, postId, { status: prevStatus === "failed" ? "failed" : prevStatus, error_code: pe.code, error_detail: pe.message.slice(0, 400) });
    }
    throw pe;
  }
}

/** 블로그에 초안으로 있는 글 → 바로 발행·예약 전환. 같은 글(remote_id)만 바꾸므로 중복 글이 생기지 않는다. */
async function switchDraft(admin: AdminDb, userId: string, post: Row, req: PublishRequest, deps: Deps) {
  const mode = req.mode as "publish" | "schedule";
  const { data: locked } = await admin.from("wba_posts").update({ status: "publishing", mode, error_code: null, error_detail: null, updated_at: new Date().toISOString() })
    .eq("id", post.id).eq("user_id", userId).eq("status", "draft").eq("remote_id", post.remote_id).select("id");
  if (!Array.isArray(locked) || locked.length !== 1) throw new InputError("이미 발행을 진행 중입니다.", 409, "busy");
  let sent = false;
  try {
    let result: PublishResult;
    if (post.platform === "wordpress") {
      const conn = await loadWordpressConnection(admin, userId);
      if (!conn) throw new PublishError("auth", "워드프레스가 연결돼 있지 않습니다. 「API키등록·플랫폼연동」에서 다시 연결해 주세요.");
      sent = true;
      result = await wpSetStatus(conn, post.remote_id!, { mode, scheduledAt: req.scheduledAt }, deps.wp ?? { fetchImpl: safeFetchImpl });
    } else {
      const { token, account } = await getValidBloggerToken(admin, userId, deps.blogger);
      const blogId = String((account.extra as { blog_id?: string }).blog_id ?? "");
      sent = true;
      result = await blPublishExisting(token, blogId, post.remote_id!, { mode, scheduledAt: req.scheduledAt }, deps.blogger);
    }
    const imageCount = (post.images ?? []).filter((i) => i.status === "done" && i.path).length;
    const publishedAt = result.status === "published" ? new Date((deps.now ?? Date.now)()).toISOString() : null;
    await setRow(admin, userId, post.id, { status: result.status, ...(result.url ? { remote_url: result.url } : {}), scheduled_at: result.scheduledAt, published_at: publishedAt, ...retentionPatch(post.platform, result.status, imageCount, publishedAt) });
    return { ...result, platform: post.platform };
  } catch (e) {
    const pe = e instanceof PublishError ? e : new PublishError(sent ? "uncertain" : "server", "발행 중 알 수 없는 오류가 났습니다.");
    // 보낸 뒤 결과를 모르면 「확인 필요」(자동 재시도 없음), 보내기 전·명확한 거절이면 초안으로 되돌림
    if (pe.code === "uncertain") await setRow(admin, userId, post.id, { status: "uncertain", error_code: pe.code, error_detail: pe.message.slice(0, 400) });
    else await setRow(admin, userId, post.id, { status: "draft", error_code: pe.code, error_detail: pe.message.slice(0, 400) });
    throw pe;
  }
}

/** 예약 취소 → 블로그에서 초안으로 되돌림 */
export async function cancelScheduled(admin: AdminDb, userId: string, postId: string, deps: Deps = {}) {
  const { data } = await admin.from("wba_posts").select("id, platform, status, remote_id").eq("id", postId).eq("user_id", userId).maybeSingle();
  if (!data) throw new InputError("원고를 찾지 못했습니다.", 404, "not_found");
  if (data.status !== "scheduled" || !data.remote_id) throw new InputError("예약된 글만 취소할 수 있습니다.", 409, "not_scheduled");
  let r: PublishResult;
  if (data.platform === "wordpress") {
    const conn = await loadWordpressConnection(admin, userId);
    if (!conn) throw new PublishError("auth", "워드프레스 연결이 끊겼습니다. 다시 연결해 주세요.");
    r = await wpCancel(conn, data.remote_id, deps.wp ?? { fetchImpl: safeFetchImpl });
  } else {
    const { token, account } = await getValidBloggerToken(admin, userId, deps.blogger);
    r = await blRevert(token, String((account.extra as { blog_id?: string }).blog_id ?? ""), data.remote_id, deps.blogger);
  }
  await setRow(admin, userId, postId, { status: r.status, scheduled_at: null, remote_url: r.url, keep_images: false, image_expires_at: null });
  return r;
}

export function publishErrorView(e: unknown): { status: number; error: string; code: string } {
  if (e instanceof InputError) return { status: e.status, error: e.message, code: e.code };
  if (e instanceof PublishError) {
    const status = e.code === "bad_request" ? 400 : e.code === "auth" || e.code === "auth_header_stripped" ? 401 : e.code === "forbidden" ? 403 : e.code === "rate_limited" ? 429 : 502;
    return { status, error: e.message, code: e.code };
  }
  return { status: 500, error: "발행 중 알 수 없는 오류가 났습니다. 블로그에서 글이 올라갔는지 먼저 확인해 주세요.", code: "unknown" };
}
