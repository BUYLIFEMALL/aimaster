import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/lib/errors";

// 회원별 저장 데이터(lyric_video_items, 30일 뒤 자동 삭제). 서비스 롤로 접근하므로 모든 쿼리에 user_id 조건을 직접 건다(멀티테넌시 원칙 2).
// 음악·커버 파일은 저장하지 않는다 — 가사 시간표·디자인·제목만(회원 PC의 파일을 다시 열 때 다시 고른다).
export const KINDS = ["project"] as const;
export type Kind = (typeof KINDS)[number];
export const isKind = (v: unknown): v is Kind => typeof v === "string" && (KINDS as readonly string[]).includes(v);
const T = "lyric_video_items";
const LIMIT: Record<Kind, number> = { project: 200 };
const COLS = "id, kind, title, data, created_at, updated_at";

export async function listItems(userId: string, kind: Kind) {
  const { data, error } = await createAdminClient().from(T).select(COLS).eq("user_id", userId).eq("kind", kind).order("updated_at", { ascending: false }).limit(LIMIT[kind]);
  if (error) throw new UserError(500, "목록을 불러오지 못했습니다.");
  return data ?? [];
}

export async function getItem(userId: string, id: string) {
  const { data } = await createAdminClient().from(T).select(COLS).eq("user_id", userId).eq("id", id).maybeSingle();
  if (!data) throw new UserError(404, "항목을 찾지 못했습니다.");
  return data;
}

export async function createItem(userId: string, kind: Kind, title: string, data: unknown) {
  const admin = createAdminClient();
  const { count } = await admin.from(T).select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", kind);
  if ((count ?? 0) >= LIMIT[kind]) throw new UserError(400, `저장할 수 있는 개수(${LIMIT[kind]}개)를 넘었습니다. 오래된 항목을 지운 뒤 다시 저장해 주세요.`);
  const { data: row, error } = await admin.from(T).insert({ user_id: userId, kind, title: title.slice(0, 120), data }).select(COLS).single();
  if (error || !row) throw new UserError(500, "저장하지 못했습니다.");
  return row;
}

export async function updateItem(userId: string, id: string, patch: { title?: string; data?: unknown }) {
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.title === "string") upd.title = patch.title.slice(0, 120);
  if (patch.data !== undefined) upd.data = patch.data;
  const { data, error } = await createAdminClient().from(T).update(upd).eq("user_id", userId).eq("id", id).select(COLS).maybeSingle();
  if (error || !data) throw new UserError(404, "항목을 찾지 못했습니다.");
  return data;
}

export async function deleteItem(userId: string, id: string) {
  const { error } = await createAdminClient().from(T).delete().eq("user_id", userId).eq("id", id);
  if (error) throw new UserError(500, "삭제하지 못했습니다.");
}
