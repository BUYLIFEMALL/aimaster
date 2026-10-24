// 서버 API에서만 사용. 모든 조회/변경은 인증된 회원 ID로 한정한다.
import type { SupabaseClient } from "@supabase/supabase-js";
import { CompatibleChatError } from "../compatibleChat/config";
import { botDraft, botReference, PRESET_BOTS, revisionNumber, UUID, type BotDefinition } from "./core";
type Store = Pick<SupabaseClient, "from">;
const COLUMNS = "id,name,instructions,provider,model,temperature,revision";

function ownId(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new CompatibleChatError("내 봇을 다시 선택해 주세요.");
  return value.toLowerCase();
}
function available(row: BotDefinition): BotDefinition {
  try { botDraft(row); return { ...row, available: true }; }
  catch { return { ...row, available: false, unavailableReason: "지원이 끝났거나 올바르지 않은 모델 설정입니다. 봇 관리에서 모델을 변경해 주세요." }; }
}
export async function listBots(store: Store, userId: string) {
  const { data, error } = await store.from("dcb_bots").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: true }).limit(100);
  if (error) throw new CompatibleChatError("내 봇 목록을 불러오지 못했습니다.", 500);
  return { presets: PRESET_BOTS.map((bot) => ({ ...bot, available: true })), bots: (data ?? []).map((row) => available(row as BotDefinition)) };
}
export async function resolveBot(store: Store, userId: string, reference: unknown, expectedRevision?: unknown): Promise<BotDefinition | null> {
  const ref = botReference(reference);
  if (ref === null) return null;
  let bot = PRESET_BOTS.find((entry) => entry.id === ref);
  if (!bot) {
    const { data, error } = await store.from("dcb_bots").select(COLUMNS).eq("user_id", userId).eq("id", ref).maybeSingle();
    if (error) throw new CompatibleChatError("선택한 봇을 확인하지 못했습니다.", 500);
    if (!data) throw new CompatibleChatError("삭제되었거나 사용할 수 없는 봇입니다. 봇을 해제하거나 내 봇을 다시 선택해 주세요.", 404);
    bot = data as BotDefinition;
  }
  const current = available(bot);
  if (!current.available) throw new CompatibleChatError(current.unavailableReason!, 400);
  if (expectedRevision !== undefined && revisionNumber(expectedRevision) !== current.revision) throw new CompatibleChatError("봇 설정이 다른 창에서 변경됐습니다. 새로 불러온 설정을 확인한 뒤 다시 보내 주세요.", 409);
  return current;
}
export async function createBot(store: Store, userId: string, input: unknown) {
  const draft = botDraft(input);
  const { count, error: countError } = await store.from("dcb_bots").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (countError) throw new CompatibleChatError("내 봇 개수를 확인하지 못했습니다.", 500);
  if ((count ?? 0) >= 100) throw new CompatibleChatError("내 봇은 100개까지 보관할 수 있습니다. 사용하지 않는 봇을 정리해 주세요.");
  const { data, error } = await store.from("dcb_bots").insert({ ...draft, user_id: userId }).select(COLUMNS).single();
  if (error || !data) throw new CompatibleChatError("봇을 저장하지 못했습니다.", 500);
  return data as BotDefinition;
}
async function missedChange(store: Store, userId: string, id: string): Promise<never> {
  const { data, error } = await store.from("dcb_bots").select("id").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error) throw new CompatibleChatError("봇 변경 상태를 확인하지 못했습니다.", 500);
  throw new CompatibleChatError(data ? "다른 창에서 봇이 변경됐습니다. 목록에서 최신 설정을 다시 선택해 주세요." : "내 봇을 찾지 못했습니다.", data ? 409 : 404);
}
export async function updateBot(store: Store, userId: string, value: unknown, input: unknown, expectedRevision: unknown) {
  const id = ownId(value), draft = botDraft(input), revision = revisionNumber(expectedRevision);
  const { data, error } = await store.from("dcb_bots").update({ ...draft, revision: revision + 1, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).eq("revision", revision).select(COLUMNS).maybeSingle();
  if (error) throw new CompatibleChatError("봇을 수정하지 못했습니다.", 500);
  if (!data) return missedChange(store, userId, id);
  return data as BotDefinition;
}
export async function deleteBot(store: Store, userId: string, value: unknown, expectedRevision: unknown) {
  const id = ownId(value), revision = revisionNumber(expectedRevision);
  const { data, error } = await store.from("dcb_bots").delete().eq("id", id).eq("user_id", userId).eq("revision", revision).select("id").maybeSingle();
  if (error) throw new CompatibleChatError("봇을 삭제하지 못했습니다.", 500);
  if (!data) await missedChange(store, userId, id);
  // 기존 방 참조와 과거 메시지 설정은 유지한다. 방 재열기 시 삭제 사실을 알리고 해제하도록 한다.
}
