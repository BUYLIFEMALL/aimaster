import { nextTimestamp, readExecution, withExecution } from "./executionRuns";
import { readNaverExecutionMode } from "./naverPublishing";

// 2026-10-23 v2.15: 「준비」 모드로 보낸 글을 회원이 네이버에서 직접 발행한 결과를 기록한다.
// 확장 자동 감지(/api/extension/prepared-published)와 보관함 직접 입력(/api/posts/[id]/prepared-published)이 같이 쓴다.
// 확장은 버튼을 누르지 않고 읽기만 한다 — 최종 발행은 회원. 원고 저장 경로는 여전히 published를 막는다.
export type PreparedPublishSource = "extension" | "member";

const BLOG_ID = /^[A-Za-z0-9_-]{1,50}$/;

/** 그 원고 블로그의 글 주소만 받아 `https://blog.naver.com/<blogId>/<글번호>` 한 모양으로 돌려준다. 아니면 null. */
export function normalizeNaverPostUrl(input: unknown, blogId: string): string | null {
  if (typeof input !== "string" || !BLOG_ID.test(blogId)) return null;
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  if (url.protocol !== "https:" || !["blog.naver.com", "m.blog.naver.com"].includes(url.hostname)) return null;
  const direct = /^\/([^/]+)\/(\d{1,20})\/?$/.exec(url.pathname);
  let logNo = "";
  if (direct && direct[1].toLowerCase() === blogId.toLowerCase()) logNo = direct[2];
  else if (/^\/PostView\.(naver|nhn)$/i.test(url.pathname) && (url.searchParams.get("blogId") || "").toLowerCase() === blogId.toLowerCase()) logNo = url.searchParams.get("logNo") || "";
  return /^\d{1,20}$/.test(logNo) ? `https://blog.naver.com/${blogId}/${logNo}` : null;
}

type Reply = { status: number; body: Record<string, unknown> };
const columns = "id,user_id,blog_id,status,post_url,published_at,updated_at,research_summary";

export async function recordPreparedPublish(admin: any, userId: string, postId: string, postUrl: unknown, source: PreparedPublishSource, now = Date.now()): Promise<Reply> {
  if (!/^[\da-f-]{36}$/i.test(postId)) return { status: 400, body: { error: "원고 번호가 올바르지 않습니다." } };
  const read = () => admin.from("nba_posts").select(columns).eq("id", postId).eq("user_id", userId).maybeSingle();
  const { data: post, error } = await read();
  if (error) return { status: 503, body: { error: "원고를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요." } };
  if (!post) return { status: 404, body: { error: "본인 원고를 찾을 수 없습니다." } };
  const url = normalizeNaverPostUrl(postUrl, post.blog_id);
  if (!url) return { status: 400, body: { error: `이 원고의 블로그(${post.blog_id}) 글 주소를 넣어 주세요. 예: https://blog.naver.com/${post.blog_id}/224451486747` } };
  const done = (row: any): Reply => ({ status: 200, body: { success: true, persisted: true, taskId: postId, status: "published", postUrl: row.post_url, publishedAt: row.published_at } });
  if (post.status === "published") {
    return post.post_url === url ? done(post) : { status: 409, body: { error: "이미 다른 주소로 발행 완료가 기록된 원고입니다." } };
  }
  if (post.status !== "prepared") return { status: 409, body: { error: "「발행 전 준비 완료」 원고만 직접 발행 결과를 기록할 수 있습니다." } };
  let mode;
  try { mode = readNaverExecutionMode(post.research_summary, post.blog_id); } catch { mode = null; }
  if (mode !== "prepare") return { status: 409, body: { error: "준비 모드로 보낸 원고가 아닙니다." } };
  const at = nextTimestamp(post.updated_at, now);
  const run = readExecution(post.research_summary);
  const message = source === "extension" ? "회원 직접 발행 확인(확장)" : "회원 직접 발행(주소 입력)";
  let query = admin.from("nba_posts").update({
    status: "published", post_url: url, published_at: at, error_message: null, updated_at: at,
    ...(run ? { research_summary: withExecution(post.research_summary, { ...run, stage: "published", message, updatedAt: at, endedAt: at }) } : {}),
  }).eq("id", postId).eq("user_id", userId).eq("status", "prepared");
  if (post.updated_at) query = query.eq("updated_at", post.updated_at);
  const { data: saved, error: saveError } = await query.select(columns).maybeSingle();
  if (saveError) return { status: 503, body: { error: "발행 결과를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." } };
  if (saved) return done(saved);
  // 응답을 잃고 다시 보낸 경우: 같은 주소로 이미 기록됐으면 성공으로 본다.
  const { data: again, error: againError } = await read();
  if (againError || !again) return { status: 503, body: { error: "저장 결과를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요." } };
  if (again.status === "published" && again.post_url === url) return done(again);
  return { status: 409, body: { error: "원고 상태가 바뀌었습니다. 보관함을 새로고침해 주세요." } };
}
