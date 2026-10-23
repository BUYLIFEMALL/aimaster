// 계정·콘텐츠 분류를 서버 DB(회원별)와 동기화하는 브라우저용 도우미.
// 서버가 기준이고, 브라우저 저장소는 빠른 캐시다. 네트워크/권한 오류는 조용히 null(실패)로 돌려
// 화면은 기존 로컬 값으로 계속 동작한다.

export const SAMPLE_BLOG_ID = "myblog_sample"; // 예전 화면이 넣어주던 견본 계정(서버에 저장하지 않는다)
export const SYNC_DONE_PREFIX = "nba_server_sync_done_"; // 이 브라우저의 로컬 데이터를 서버로 합친 뒤 남기는 표시

async function call(url: string, init?: RequestInit): Promise<any | null> {
  if (typeof fetch !== "function") return null;
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface SyncAccount {
  blog_id: string;
  label: string;
}

export async function pullAccounts(): Promise<SyncAccount[] | null> {
  const data = await call("/api/accounts");
  return Array.isArray(data?.accounts) ? data.accounts : null;
}

export async function pushAccounts(list: SyncAccount[]): Promise<boolean> {
  const accounts = list
    .filter((a) => a && typeof a.blog_id === "string" && a.blog_id !== SAMPLE_BLOG_ID)
    .map((a) => ({ blog_id: a.blog_id, label: a.label }));
  return Boolean(await call("/api/accounts", { method: "PUT", body: JSON.stringify({ accounts }) }));
}

/** 서버 목록을 기준으로 로컬 전용 항목은 뒤에 붙인다. 로컬의 부가 필드(예전 카테고리 등)는 blog_id로 이어 보존한다. */
export function mergeAccounts<T extends SyncAccount>(server: SyncAccount[], local: T[], includeLocalOnly: boolean) {
  const localByBlog = new Map(local.map((a) => [a.blog_id, a]));
  const merged = server.map((s: any) => {
    const mine = localByBlog.get(s.blog_id);
    return { ...(mine || { categories: [] }), id: (mine as any)?.id || `acc-${s.id}`, blog_id: s.blog_id, label: s.label } as unknown as T;
  });
  const serverBlogs = new Set(server.map((s) => s.blog_id));
  const localOnly = local.filter((a) => a.blog_id !== SAMPLE_BLOG_ID && !serverBlogs.has(a.blog_id));
  return { merged: includeLocalOnly ? [...merged, ...localOnly] : merged, localOnly };
}

export interface SyncCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export async function pullCategories(): Promise<SyncCategory[] | null> {
  const data = await call("/api/content-categories");
  return Array.isArray(data?.categories) ? data.categories : null;
}

export async function pushCategories(categories: SyncCategory[]): Promise<boolean> {
  return Boolean(await call("/api/content-categories", { method: "PUT", body: JSON.stringify({ categories }) }));
}

export function mergeCategories(server: SyncCategory[], local: SyncCategory[], includeLocalOnly: boolean): SyncCategory[] {
  if (!includeLocalOnly) return server;
  const ids = new Set(server.map((c) => c.id));
  const names = new Set(server.map((c) => c.name));
  const extra = local.filter((c) => !ids.has(c.id) && !names.has(c.name));
  return [...server, ...extra].map((c, index) => ({ ...c, sort_order: index + 1 }));
}
