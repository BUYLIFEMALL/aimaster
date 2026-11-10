// 공용 발행 엔진 — 구글 블로그(블로그스팟) Blogger API v3
// 회원 본인 구글 OAuth 앱으로 받은 액세스 토큰만 쓴다(토큰 갱신은 호출하는 쪽). 재시도 없음.
// 이미지 업로드 API가 없으므로 본문 이미지는 https 절대 주소여야 한다.
import { http, codeForStatus, type FetchLike } from "./http";
import { PublishError, checkInput, checkScheduledAt, type PublishInput, type PublishResult, type PublishStatus } from "./types";

export const BLOGGER_API = "https://www.googleapis.com/blogger/v3";
export const BLOGGER_SCOPE = "https://www.googleapis.com/auth/blogger";

export interface BloggerDeps {
  fetchImpl?: FetchLike;
  now?: () => number;
}

interface GoogleErrorBody { error?: { code?: number; message?: string; errors?: { reason?: string }[] } }

function gError(status: number, body: unknown, write: boolean): PublishError {
  const e = (body as GoogleErrorBody | null)?.error;
  const reason = e?.errors?.[0]?.reason || "";
  const msg = String(e?.message || "").slice(0, 200);
  if (status === 401) return new PublishError("auth", "구글 연결이 만료됐습니다. 「구글 연결」을 다시 눌러 주세요.", { status });
  if (status === 403 && /insufficientPermissions|forbidden/i.test(reason + msg)) return new PublishError("forbidden", "이 구글 계정에 그 블로그 글쓰기 권한이 없거나, 연결할 때 블로그 권한을 허용하지 않았습니다.", { status });
  if (status === 403 && /rateLimit|quota/i.test(reason + msg)) return new PublishError("rate_limited", "구글 블로그 하루 호출 한도에 걸렸습니다. 내일 다시 시도해 주세요.", { status });
  if (write && status >= 500) return new PublishError("uncertain", "구글이 오류를 돌려줘 글이 저장됐는지 확인하지 못했습니다. 블로그 관리 화면에서 먼저 확인해 주세요.", { status });
  return new PublishError(codeForStatus(status), msg || `구글 블로그 오류(${status})`, { status });
}

async function call(token: string, path: string, opts: { method?: string; query?: Record<string, string>; json?: unknown; write?: boolean; idempotent?: boolean }, deps: BloggerDeps) {
  if (!token) throw new PublishError("auth", "구글 연결이 필요합니다.");
  const q = new URLSearchParams(opts.query || {}).toString();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  let body: BodyInit | null = null;
  if (opts.json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.json); }
  const r = await http(`${BLOGGER_API}${path}${q ? `?${q}` : ""}`, { method: opts.method || "GET", headers, body, fetchImpl: deps.fetchImpl, idempotent: opts.idempotent, timeoutMs: 45_000 });
  if (r.status < 200 || r.status >= 300) throw gError(r.status, r.json, !!opts.write);
  if (r.json === null && opts.write) throw new PublishError("uncertain", "구글 응답을 읽지 못해 결과를 확인하지 못했습니다. 블로그 관리 화면에서 먼저 확인해 주세요.", { status: r.status });
  return r.json;
}

export interface BloggerBlog { id: string; name: string; url: string }

export async function listBlogs(token: string, deps: BloggerDeps = {}): Promise<BloggerBlog[]> {
  const r = (await call(token, "/users/self/blogs", { query: { fields: "items(id,name,url)" } }, deps)) as { items?: { id: string; name: string; url: string }[] } | null;
  return (r?.items || []).map((b) => ({ id: String(b.id), name: String(b.name), url: String(b.url) }));
}

/** 라벨 정리 — 중복 제거, 쉼표 제거, 합계 200자 이내(구글 제한) */
export function cleanLabels(tags: string[] = []): string[] {
  const out: string[] = [];
  let total = 0;
  for (const raw of tags) {
    const t = raw.replace(/,/g, " ").trim().slice(0, 50);
    if (!t || out.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    if (total + t.length > 200) break;
    out.push(t);
    total += t.length;
  }
  return out;
}

/** 본문 안 이미지 중 https 절대 주소가 아닌 것(구글 블로그에서 깨짐) */
export function nonHttpsImages(html: string): string[] {
  const bad: string[] = [];
  for (const m of html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) if (!/^https:\/\//i.test(m[1])) bad.push(m[1].slice(0, 80));
  return bad;
}

function mapStatus(s: string): PublishStatus {
  if (s === "LIVE") return "published";
  if (s === "SCHEDULED") return "scheduled";
  return "draft";
}

interface BPost { id?: string; url?: string; status?: string; published?: string }

function toResult(p: BPost): PublishResult {
  const status = mapStatus(String(p.status || "DRAFT"));
  return { status, remoteId: String(p.id), url: p.url ? String(p.url) : null, scheduledAt: status === "scheduled" && p.published ? new Date(p.published).toISOString() : null };
}

/** 글 올리기 — 초안 / 바로 발행 / 예약(초안 저장 후 publishDate로 예약) */
export async function createPost(token: string, blogId: string, input: PublishInput, deps: BloggerDeps = {}): Promise<PublishResult> {
  checkInput(input);
  if (!blogId) throw new PublishError("bad_request", "올릴 블로그를 골라 주세요.");
  const bad = nonHttpsImages(input.html);
  if (bad.length) throw new PublishError("bad_request", `구글 블로그는 https 주소 이미지만 보입니다. 바꿔야 할 이미지 ${bad.length}개: ${bad[0]}`);
  const when = input.mode === "schedule" ? checkScheduledAt(input.scheduledAt, deps.now?.()) : null;
  const body = { kind: "blogger#post", title: input.title, content: input.html, labels: cleanLabels(input.tags) };
  const created = (await call(token, `/blogs/${encodeURIComponent(blogId)}/posts`, {
    method: "POST",
    query: { isDraft: input.mode === "publish" ? "false" : "true", fetchBody: "false" },
    json: body,
    write: true,
  }, deps)) as BPost | null;
  if (!created?.id) throw new PublishError("uncertain", "글 번호를 받지 못해 결과를 확인하지 못했습니다. 블로그 관리 화면에서 먼저 확인해 주세요.");
  const first = toResult(created);
  if (input.mode !== "schedule") return first;

  // 2단계: 저장된 초안에 예약 걸기. 실패하면 초안은 이미 있으므로 partial로 알려 기록에 남긴다.
  try {
    const sched = (await call(token, `/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(first.remoteId)}/publish`, {
      method: "POST",
      query: { publishDate: when!, fetchBody: "false" },
      write: true,
      idempotent: true,
    }, deps)) as BPost | null;
    if (!sched?.id) throw new PublishError("uncertain", "예약 결과를 받지 못했습니다.");
    return toResult(sched);
  } catch (e) {
    const pe = e instanceof PublishError ? e : new PublishError("uncertain", "예약 중 알 수 없는 오류가 났습니다.");
    throw new PublishError(pe.code, `초안은 저장됐지만 예약을 걸지 못했습니다: ${pe.message}`, { status: pe.status, partial: { ...first, status: "draft" } });
  }
}

/** 예약 취소·발행 취소 → 초안으로 되돌림 */
export async function revertToDraft(token: string, blogId: string, postId: string, deps: BloggerDeps = {}): Promise<PublishResult> {
  const r = (await call(token, `/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}/revert`, { method: "POST", query: { fetchBody: "false" }, write: true, idempotent: true }, deps)) as BPost;
  return toResult(r);
}
