import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// 텔레그램 연결은 (user_id, program_slug) 단위다. 2026-10-23 병합 A로 롱테일 키워드분석이 이 앱에 들어왔으므로,
// 이 앱에서 새로 연결한 봇을 먼저 쓰고, 없으면 롱테일에서 연결해 둔 본인 봇을 그대로 쓴다(다시 연결하지 않아도 됨).
export const THIS_PROGRAM_SLUG = "competitor-analysis";
export const LEGACY_PROGRAM_SLUG = "longtail-keyword-expander";

export async function getTelegramLink(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from("user_telegram_links")
    .select("program_slug, bot_token, chat_id, bot_username")
    .eq("user_id", userId)
    .in("program_slug", [THIS_PROGRAM_SLUG, LEGACY_PROGRAM_SLUG]);
  const rows = data ?? [];
  return rows.find((r) => r.program_slug === THIS_PROGRAM_SLUG) ?? rows[0] ?? null;
}
