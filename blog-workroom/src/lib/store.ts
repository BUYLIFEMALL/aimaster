import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/lib/errors";
import { retainedFilter } from "@/lib/retention";

// 회원 작업 저장소: public.blog_workroom_items(user_id + RLS owner-only).
// 서버는 service role로 읽고 쓰므로 모든 조회·수정에 user_id 조건을 반드시 붙인다(멀티테넌시 원칙 2).
export const KINDS = ["settings", "blog", "keyword", "brief", "bench", "research", "draft", "final", "image_job"] as const;
export type Kind = (typeof KINDS)[number];
export const isKind = (v: unknown): v is Kind => typeof v === "string" && (KINDS as readonly string[]).includes(v);

export interface Item<T = Record<string, unknown>> { id: string; kind: Kind; title: string; data: T; ref_id: string | null; created_at: string; updated_at: string }
const TABLE = "blog_workroom_items";
const COLS = "id, kind, title, data, ref_id, created_at, updated_at";
const LIMIT: Partial<Record<Kind, number>> = { keyword: 1000, blog: 30 };

export async function listItems<T>(userId: string, kind: Kind, opts: { refId?: string; limit?: number } = {}): Promise<Item<T>[]> {
  let q = createAdminClient().from(TABLE).select(COLS).eq("user_id", userId).eq("kind", kind).or(retainedFilter()).order("updated_at", { ascending: false }).limit(opts.limit ?? 200);
  if (opts.refId) q = q.eq("ref_id", opts.refId);
  const { data, error } = await q;
  if (error) throw new UserError(500, "저장된 작업을 불러오지 못했습니다.");
  return (data ?? []) as Item<T>[];
}

export async function getItem<T>(userId: string, id: string, kind?: Kind): Promise<Item<T> | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  let q = createAdminClient().from(TABLE).select(COLS).eq("user_id", userId).eq("id", id).or(retainedFilter()); // v1.12: 30일 지난 생성물은 바로 숨김
  if (kind) q = q.eq("kind", kind);
  const { data } = await q.maybeSingle();
  return (data as Item<T> | null) ?? null;
}

export async function createItem<T>(userId: string, kind: Kind, title: string, data: T, refId: string | null = null): Promise<Item<T>> {
  const admin = createAdminClient();
  const cap = LIMIT[kind] ?? 300;
  const { count } = await admin.from(TABLE).select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", kind);
  if ((count ?? 0) >= cap) throw new UserError(400, `보관 개수(${cap}개)를 넘었습니다. 필요 없는 항목을 지운 뒤 다시 시도해 주세요.`);
  const { data: row, error } = await admin.from(TABLE).insert({ user_id: userId, kind, title: title.slice(0, 200), data, ref_id: refId }).select(COLS).single();
  if (error || !row) throw new UserError(500, "작업을 저장하지 못했습니다.");
  return row as Item<T>;
}

export async function updateItem<T>(userId: string, id: string, patch: { title?: string; data?: T }): Promise<Item<T>> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) body.title = patch.title.slice(0, 200);
  if (patch.data !== undefined) body.data = patch.data;
  const { data, error } = await createAdminClient().from(TABLE).update(body).eq("user_id", userId).eq("id", id).select(COLS).single();
  if (error || !data) throw new UserError(500, "작업을 저장하지 못했습니다.");
  return data as Item<T>;
}

export async function deleteItem(userId: string, id: string): Promise<void> {
  const { error } = await createAdminClient().from(TABLE).delete().eq("user_id", userId).eq("id", id);
  if (error) throw new UserError(500, "삭제하지 못했습니다.");
}

// v1.12 (BC-05): 이미지 작업의 파일 폴더(회원/작업번호) 전체를 지운다 — 글을 지워도 파일이 남던 문제 수정.
export async function removeJobImages(userId: string, jobId: string): Promise<number> {
  const storage = createAdminClient().storage.from("blog-workroom");
  const folder = `${userId}/${jobId}`;
  const { data, error } = await storage.list(folder, { limit: 1000 });
  if (error || !data?.length) return 0;
  const paths = data.filter((f) => f.id !== null).map((f) => `${folder}/${f.name}`);
  if (!paths.length) return 0;
  const { error: removeError } = await storage.remove(paths);
  return removeError ? 0 : paths.length;
}

/** 회원별 설정(한 건) */
export async function getSettings<T>(userId: string): Promise<Item<T> | null> {
  return (await listItems<T>(userId, "settings", { limit: 1 }))[0] ?? null;
}
