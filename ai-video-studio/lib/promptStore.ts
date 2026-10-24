import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import {
  boardFromRows, MAX_MINE, MINE_DAYS, presetToRow, rowToPreset, sanitizeMineInput, sanitizePresetInput,
  type BoardPresetRow, type MinePrompt,
} from "@/lib/promptBoard";

// 영상 프롬프트 게시판 A안(v1.19) 저장소 — 예시는 avs_preset_prompts(관리자만 고침, 회원은 공개분만 읽음),
// 내 프롬프트는 avs_user_prompts(회원 본인 줄만, 30일 뒤 /api/cron/cleanup이 지움). 서버 키를 쓰므로 user_id 조건을 코드에서 건다.

export class PromptError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type MineRow = { id: string; title: string; idea: string; style_id: string | null; camera_id: string | null; created_at: string; expires_at: string };
const toMine = (r: MineRow): MinePrompt => ({ id: r.id, title: r.title, idea: r.idea, styleId: r.style_id, cameraId: r.camera_id, createdAt: r.created_at, expiresAt: r.expires_at });

/** 게시판 예시 — 관리자는 숨긴 것까지. 표가 없거나 읽기 실패·비어 있으면 코드 속 예비 목록 */
export async function listPresets(includeHidden: boolean): Promise<{ presets: BoardPresetRow[]; source: "db" | "code" }> {
  const admin = createAdminClient();
  let q = admin.from("avs_preset_prompts").select("id, category, title, idea, style_id, camera_id, input, sort_order, is_published").limit(500);
  if (!includeHidden) q = q.eq("is_published", true);
  const { data, error } = await q;
  if (error) { console.error("[promptStore] presets", error.message); return boardFromRows(null); }
  const rows = (data ?? []).map((r) => rowToPreset(r as Record<string, unknown>)).filter((r): r is BoardPresetRow => !!r);
  // 관리자가 전부 숨긴 경우에도 회원 화면은 예비 목록이 아니라 빈 목록이어야 하므로, 표에 줄이 하나라도 있으면 DB 결과를 쓴다
  if (!includeHidden && rows.length === 0) {
    const { count } = await admin.from("avs_preset_prompts").select("id", { count: "exact", head: true });
    if (count) return { presets: [], source: "db" };
  }
  return boardFromRows(rows);
}

/** 관리자 예시 저장(같은 id면 고치기) */
export async function savePreset(raw: unknown): Promise<BoardPresetRow> {
  const v = sanitizePresetInput(raw);
  if (!v.ok) throw new PromptError(400, v.error);
  const { error } = await createAdminClient().from("avs_preset_prompts").upsert({ ...presetToRow(v.value), updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new PromptError(500, "예시를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return v.value;
}

/** 내 프롬프트 목록(본인만, 만료 전, 새것부터) */
export async function listMine(userId: string): Promise<MinePrompt[]> {
  const { data, error } = await createAdminClient()
    .from("avs_user_prompts")
    .select("id, title, idea, style_id, camera_id, created_at, expires_at")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(MAX_MINE);
  if (error) { console.error("[promptStore] mine", error.message); return []; }
  return ((data ?? []) as MineRow[]).map(toMine);
}

/** 내 프롬프트 저장(회원당 MAX_MINE개까지) */
export async function addMine(userId: string, raw: unknown): Promise<MinePrompt> {
  const v = sanitizeMineInput(raw);
  if (!v.ok) throw new PromptError(400, v.error);
  const admin = createAdminClient();
  const { count } = await admin.from("avs_user_prompts").select("id", { count: "exact", head: true }).eq("user_id", userId).gt("expires_at", new Date().toISOString());
  if ((count ?? 0) >= MAX_MINE) throw new PromptError(400, `내 프롬프트는 ${MAX_MINE}개까지 저장됩니다. 안 쓰는 것을 지운 뒤 다시 저장해 주세요.`);
  const expires = new Date(Date.now() + MINE_DAYS * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("avs_user_prompts")
    .insert({ user_id: userId, title: v.value.title, idea: v.value.idea, style_id: v.value.styleId, camera_id: v.value.cameraId, expires_at: expires })
    .select("id, title, idea, style_id, camera_id, created_at, expires_at")
    .single();
  if (error || !data) throw new PromptError(500, "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return toMine(data as MineRow);
}

/** 내 프롬프트 지우기(본인 줄만) */
export async function deleteMine(userId: string, id: unknown): Promise<void> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new PromptError(400, "지울 프롬프트를 찾지 못했습니다.");
  const { error } = await createAdminClient().from("avs_user_prompts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new PromptError(500, "지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
}
