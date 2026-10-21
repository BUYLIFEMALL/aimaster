import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Suno 콜백 중복 처리 방지 잠금(2026-10-21, docs/SUNOAPI_REFERENCE.md §3).
// sunoapi.org는 15초 안에 200을 못 받으면 같은 taskId로 콜백을 다시 보내고, 정상일 때도 여러 번 올 수 있다.
// 곡 저장(앨범 커버 생성·파일 복사)은 15초를 넘길 수 있어, 처리를 시작하기 전에 행을 「처리 중」으로 표시하고
// 그 표시를 먼저 차지한 요청 하나만 처리한다. 상태 칸(check 제약)을 바꾸지 않으려고 error_message에 표시를 둔다
// (화면은 status가 failed일 때만 error_message를 보여 준다). 처리 중 서버가 멈춰도 5분 뒤에는 다시 차지할 수 있다.
export const SYNC_LOCK = "__syncing__";
const STALE_MS = 5 * 60 * 1000;

type Table = "music_tracks" | "music_track_remixes" | "music_track_mr" | "music_track_media";

export async function claimSyncLock(supabase: SupabaseClient<Database>, table: Table, id: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  const { data, error } = await supabase
    .from(table)
    .update({ error_message: SYNC_LOCK })
    .eq("id", id)
    .eq("status", "generating")
    .or(`error_message.is.null,error_message.neq.${SYNC_LOCK},updated_at.lt.${staleBefore}`)
    .select("id");
  if (error) return false;
  return (data ?? []).length > 0;
}

/** 저장이 끝나지 못하고 다시 시도할 수 있게 표시만 지운다(실패로 확정할 때는 markTrackFailed가 덮어쓴다). */
export async function releaseSyncLock(supabase: SupabaseClient<Database>, table: Table, id: string) {
  await supabase.from(table).update({ error_message: null }).eq("id", id).eq("error_message", SYNC_LOCK);
}
