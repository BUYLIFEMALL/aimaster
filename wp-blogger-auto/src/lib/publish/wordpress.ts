// 공용 발행 엔진 — 워드프레스(설치형) REST API + 응용 비밀번호
// 회원 본인 사이트·본인 계정의 응용 비밀번호만 쓴다(최상위 규칙). 재시도 없음.
import { http, codeForStatus, type FetchLike } from "./http";
import { PublishError, checkInput, checkScheduledAt, type PublishInput, type PublishResult, type PublishStatus } from "./types";

export interface WpConnection {
  siteUrl: string;
  username: string;
  appPassword: string;
  /** 발견한 REST 주소 방식(없으면 처음 호출 때 찾음) */
  restStyle?: "path" | "query";
}

export interface WpDeps {
  fetchImpl?: FetchLike;
  now?: () => number;
}

/** 회원이 넣은 주소를 사이트 기본 주소로 정리 */
export function normalizeSiteUrl(raw: string): string {
  let s = String(raw || "").trim();
  if (!s) throw new PublishError("bad_request", "워드프레스 사이트 주소를 입력해 주세요.");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try { u = new URL(s); } catch { throw new PublishError("bad_request", "사이트 주소 형식이 올바르지 않습니다."); }
  if (u.protocol !== "https:") throw new PublishError("bad_request", "응용 비밀번호는 https 주소에서만 쓸 수 있습니다. https:// 로 시작하는 주소를 넣어 주세요.");
  let path = u.pathname.replace(/\/(wp-admin|wp-login\.php|wp-json)(\/.*)?$/i, "").replace(/\/+$/, "");
  if (path === "/") path = "";
  return `${u.origin}${path}`;
}

function authHeader(c: WpConnection): string {
  const pass = String(c.appPassword || "").trim();
  const user = String(c.username || "").trim();
  if (!user || !pass) throw new PublishError("bad_request", "사용자명과 응용 비밀번호를 입력해 주세요.");
  return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

function restUrl(site: string, style: "path" | "query", route: string, query: Record<string, string> = {}): string {
  const q = new URLSearchParams(query).toString();
  if (style === "path") return `${site}/wp-json${route}${q ? `?${q}` : ""}`;
  return `${site}/?rest_route=${encodeURIComponent(route)}${q ? `&${q}` : ""}`;
}

/** /wp-json 이 막힌 사이트(고유주소 미설정 등)는 ?rest_route= 방식으로 */
export async function discoverRestStyle(siteUrl: string, deps: WpDeps = {}): Promise<"path" | "query"> {
  const site = normalizeSiteUrl(siteUrl);
  for (const style of ["path", "query"] as const) {
    try {
      const r = await http(restUrl(site, style, "/"), { fetchImpl: deps.fetchImpl, timeoutMs: 15_000 });
      const ns = (r.json as { namespaces?: string[] } | null)?.namespaces;
      if (r.status === 200 && Array.isArray(ns) && ns.includes("wp/v2")) return style;
    } catch (e) {
      if (e instanceof PublishError && e.code === "network" && style === "path") continue;
      throw e;
    }
  }
  throw new PublishError("not_found", "이 주소에서 워드프레스 REST API를 찾지 못했습니다. 워드프레스 사이트 주소인지, 보안 플러그인이 REST API를 막고 있지 않은지 확인해 주세요.");
}

interface WpErrorBody { code?: string; message?: string; data?: { status?: number; term_id?: number } }

function wpError(status: number, body: unknown, write: boolean): PublishError {
  const b = (body || {}) as WpErrorBody;
  const msg = String(b.message || "").replace(/<[^>]+>/g, "").slice(0, 200);
  if (status === 401 && b.code === "rest_not_logged_in") {
    return new PublishError("auth_header_stripped", "사이트가 로그인 정보를 받지 못했습니다. 호스팅이 인증 머리글(Authorization)을 지우는 경우입니다 — 매뉴얼의 「.htaccess 한 줄 추가」를 따라 주세요.", { status });
  }
  if (status === 401) return new PublishError("auth", `사용자명 또는 응용 비밀번호가 맞지 않습니다.${msg ? ` (${msg})` : ""}`, { status });
  if (status === 403 && /cannot_publish|cannot_create/.test(String(b.code))) return new PublishError("forbidden", "이 계정에는 글 발행 권한이 없습니다. 관리자·편집자·글쓴이 권한 계정으로 연결해 주세요.", { status });
  if (write && status >= 500) return new PublishError("uncertain", "사이트가 오류를 돌려줘 글이 저장됐는지 확인하지 못했습니다. 워드프레스 글 목록에서 먼저 확인해 주세요.", { status });
  return new PublishError(codeForStatus(status), msg || `워드프레스 오류(${status})`, { status });
}

async function call(c: WpConnection, route: string, opts: { method?: string; query?: Record<string, string>; json?: unknown; body?: BodyInit; headers?: Record<string, string>; write?: boolean; idempotent?: boolean }, deps: WpDeps) {
  const site = normalizeSiteUrl(c.siteUrl);
  const style = c.restStyle ?? (c.restStyle = await discoverRestStyle(site, deps));
  const headers: Record<string, string> = { Authorization: authHeader(c), Accept: "application/json", ...(opts.headers || {}) };
  let body: BodyInit | null = opts.body ?? null;
  if (opts.json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.json); }
  const r = await http(restUrl(site, style, route, opts.query), { method: opts.method || "GET", headers, body, fetchImpl: deps.fetchImpl, idempotent: opts.idempotent, timeoutMs: 45_000 });
  if (r.status < 200 || r.status >= 300) throw wpError(r.status, r.json, !!opts.write);
  if (r.json === null) {
    if (opts.write) throw new PublishError("uncertain", "사이트 응답을 읽지 못해 결과를 확인하지 못했습니다. 워드프레스에서 먼저 확인해 주세요.", { status: r.status });
    throw new PublishError("server", "사이트 응답을 읽지 못했습니다(보안 플러그인·캐시 화면일 수 있습니다).", { status: r.status });
  }
  return r.json;
}

export interface WpAccount { userId: number; name: string; canPublish: boolean; restStyle: "path" | "query" }

/** 연결 확인 — 본인 정보 조회 + 발행 권한 */
export async function verifyConnection(c: WpConnection, deps: WpDeps = {}): Promise<WpAccount> {
  const me = (await call(c, "/wp/v2/users/me", { query: { context: "edit" } }, deps)) as { id?: number; name?: string; capabilities?: Record<string, boolean> };
  if (!me?.id) throw new PublishError("server", "계정 정보를 확인하지 못했습니다.");
  const canPublish = !!me.capabilities?.publish_posts;
  return { userId: me.id, name: String(me.name || c.username), canPublish, restStyle: c.restStyle! };
}

export async function listCategories(c: WpConnection, deps: WpDeps = {}): Promise<{ id: number; name: string; parent: number }[]> {
  const rows = (await call(c, "/wp/v2/categories", { query: { per_page: "100", _fields: "id,name,parent" } }, deps)) as { id: number; name: string; parent: number }[];
  return Array.isArray(rows) ? rows.map((x) => ({ id: x.id, name: String(x.name), parent: x.parent || 0 })) : [];
}

/** 태그 이름 → ID(없으면 만들기) */
export async function resolveTagIds(c: WpConnection, names: string[], deps: WpDeps = {}): Promise<number[]> {
  const ids: number[] = [];
  const uniq = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 15);
  for (const name of uniq) {
    const found = (await call(c, "/wp/v2/tags", { query: { search: name, per_page: "20", _fields: "id,name" } }, deps)) as { id: number; name: string }[];
    const hit = Array.isArray(found) ? found.find((t) => String(t.name).toLowerCase() === name.toLowerCase()) : undefined;
    if (hit) { ids.push(hit.id); continue; }
    try {
      const made = (await call(c, "/wp/v2/tags", { method: "POST", json: { name }, idempotent: true }, deps)) as { id: number };
      ids.push(made.id);
    } catch (e) {
      // 같은 이름이 이미 있으면(term_exists, 400) 다시 찾아 그 ID를 쓴다
      if (!(e instanceof PublishError && e.status === 400)) throw e;
      const again = (await call(c, "/wp/v2/tags", { query: { search: name, per_page: "100", _fields: "id,name" } }, deps)) as { id: number; name: string }[];
      const hit2 = Array.isArray(again) ? again.find((t) => String(t.name).toLowerCase() === name.toLowerCase()) : undefined;
      if (!hit2) throw e;
      ids.push(hit2.id);
    }
  }
  return ids;
}

/** 이미지 1장을 회원 사이트 미디어 보관함에 올림(중복 업로드는 해가 없어 재시도 허용) */
export async function uploadMedia(c: WpConnection, file: { bytes: Uint8Array; filename: string; mime: string }, deps: WpDeps = {}): Promise<{ id: number; url: string }> {
  const safe = file.filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "image.jpg";
  const r = (await call(c, "/wp/v2/media", {
    method: "POST",
    body: file.bytes as unknown as BodyInit,
    headers: { "Content-Type": file.mime, "Content-Disposition": `attachment; filename="${safe}"` },
    idempotent: true,
  }, deps)) as { id?: number; source_url?: string };
  if (!r?.id || !r.source_url) throw new PublishError("server", "이미지를 올렸지만 주소를 받지 못했습니다.");
  return { id: r.id, url: r.source_url };
}

const WANT: Record<PublishInput["mode"], string> = { draft: "draft", publish: "publish", schedule: "future" };

function mapStatus(s: string): PublishStatus {
  if (s === "publish") return "published";
  if (s === "future") return "scheduled";
  return "draft";
}

/** 글 올리기 — 회원이 고른 방식 그대로 */
export async function createPost(c: WpConnection, input: PublishInput & { tagIds?: number[] }, deps: WpDeps = {}): Promise<PublishResult> {
  checkInput(input);
  const body: Record<string, unknown> = { title: input.title, content: input.html, status: WANT[input.mode] };
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.slug) body.slug = input.slug;
  if (input.categoryIds?.length) body.categories = input.categoryIds;
  if (input.tagIds?.length) body.tags = input.tagIds;
  if (input.featuredMediaId) body.featured_media = input.featuredMediaId;
  if (input.mode === "schedule") body.date_gmt = checkScheduledAt(input.scheduledAt, deps.now?.()).slice(0, 19);
  const r = (await call(c, "/wp/v2/posts", { method: "POST", json: body, write: true }, deps)) as { id?: number; status?: string; link?: string; date_gmt?: string };
  if (!r?.id) throw new PublishError("uncertain", "글 번호를 받지 못해 결과를 확인하지 못했습니다. 워드프레스 글 목록에서 먼저 확인해 주세요.");
  const status = mapStatus(String(r.status));
  return {
    status,
    remoteId: String(r.id),
    url: r.link ? String(r.link) : null,
    scheduledAt: status === "scheduled" && r.date_gmt ? `${String(r.date_gmt).slice(0, 19)}Z` : null,
  };
}

/** 예약 취소 → 초안으로 되돌림 */
export async function cancelSchedule(c: WpConnection, remoteId: string, deps: WpDeps = {}): Promise<PublishResult> {
  const r = (await call(c, `/wp/v2/posts/${encodeURIComponent(remoteId)}`, { method: "POST", json: { status: "draft" }, write: true, idempotent: true }, deps)) as { id: number; status: string; link?: string };
  return { status: mapStatus(r.status), remoteId: String(r.id), url: r.link ?? null, scheduledAt: null };
}
