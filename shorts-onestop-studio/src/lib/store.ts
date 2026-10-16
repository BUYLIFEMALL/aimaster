import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MODEL, isProvider, isTextModel, type AiProvider } from "@/lib/models";
import { UserError } from "@/lib/errors";

// 회원별 저장 데이터(shorts_onestop_items). 서비스 롤로 접근하므로 모든 쿼리에 user_id 조건을 직접 건다(멀티테넌시 원칙 2).
export const KINDS = ["project", "preset", "guideline", "plan"] as const;
export type Kind = (typeof KINDS)[number];
export const isKind = (v: unknown): v is Kind => typeof v === "string" && (KINDS as readonly string[]).includes(v);
const T = "shorts_onestop_items";
const LIMIT: Record<Kind, number> = { project: 200, preset: 30, guideline: 30, plan: 50 };
const COLS = "id, kind, title, data, created_at, updated_at";

export async function listItems(userId: string, kind: Kind) {
  const { data, error } = await createAdminClient().from(T).select(COLS).eq("user_id", userId).eq("kind", kind).order("updated_at", { ascending: false }).limit(LIMIT[kind]);
  if (error) throw new UserError(500, "목록을 불러오지 못했습니다.");
  return data ?? [];
}

export async function getItem(userId: string, id: string) {
  const { data } = await createAdminClient().from(T).select(COLS).eq("user_id", userId).eq("id", id).maybeSingle();
  if (!data || data.kind === "settings") throw new UserError(404, "항목을 찾지 못했습니다.");
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
  const { data, error } = await createAdminClient().from(T).update(upd).eq("user_id", userId).eq("id", id).neq("kind", "settings").select(COLS).maybeSingle();
  if (error || !data) throw new UserError(404, "항목을 찾지 못했습니다.");
  return data;
}

export async function deleteItem(userId: string, id: string) {
  const { error } = await createAdminClient().from(T).delete().eq("user_id", userId).eq("id", id).neq("kind", "settings");
  if (error) throw new UserError(500, "삭제하지 못했습니다.");
}

// ── 설정(회원당 1행) ─────────────────────────────
export interface Settings { provider: AiProvider; model: string }
export const DEFAULT_SETTINGS: Settings = { provider: "gemini", model: DEFAULT_MODEL.gemini };

export async function loadSettings(userId: string): Promise<Settings> {
  const { data } = await createAdminClient().from(T).select("data").eq("user_id", userId).eq("kind", "settings").maybeSingle();
  const d = (data?.data ?? {}) as Partial<Settings>;
  const provider = isProvider(d.provider) ? d.provider : DEFAULT_SETTINGS.provider;
  const model = isTextModel(provider, d.model) ? (d.model as string) : DEFAULT_MODEL[provider];
  return { provider, model };
}

export async function saveSettings(userId: string, s: Settings) {
  if (!isProvider(s.provider) || !isTextModel(s.provider, s.model)) throw new UserError(400, "AI 공급사·모델을 다시 골라 주세요.");
  const admin = createAdminClient();
  const { data: existing } = await admin.from(T).select("id").eq("user_id", userId).eq("kind", "settings").maybeSingle();
  const payload = { provider: s.provider, model: s.model };
  const { error } = existing
    ? await admin.from(T).update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id).eq("user_id", userId)
    : await admin.from(T).insert({ user_id: userId, kind: "settings", title: "settings", data: payload });
  if (error) throw new UserError(500, "설정을 저장하지 못했습니다.");
}
