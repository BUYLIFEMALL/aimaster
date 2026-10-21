import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { persistSunoAssetToStorage } from "@/lib/trackSync";
import { translateSunoErrorMessage } from "@/lib/ai/suno";

// Suno 커버 이미지·뮤직비디오 결과 저장(2026-10-21 Suno V6 3차 ⑦⑧). 웹훅(/api/webhooks/suno-media)과
// 수동 「상태 확인」(lib/actions/media.ts)이 함께 쓴다. Suno 쪽 파일은 14~15일 뒤 사라져 우리 저장소로 복사한다.
type Db = SupabaseClient<Database>;

export interface MediaRow {
  id: string;
  user_id: string;
  track_id: string;
  variant_id: string | null;
  kind: "suno_cover" | "video";
}

export async function saveMediaResult(db: Db, row: MediaRow, sourceUrls: string[]) {
  const urls: string[] = [];
  for (let i = 0; i < sourceUrls.length; i++) {
    const src = sourceUrls[i];
    if (row.kind === "video") {
      urls.push(await persistSunoAssetToStorage(db, `${row.user_id}/${row.variant_id ?? row.track_id}/suno-video.mp4`, src, "video/mp4"));
    } else {
      const ext = /\.jpe?g(\?|$)/i.test(src) ? "jpg" : "png";
      urls.push(
        await persistSunoAssetToStorage(db, `${row.user_id}/${row.track_id}/suno-cover-${i}.${ext}`, src, ext === "jpg" ? "image/jpeg" : "image/png"),
      );
    }
  }
  await db.from("music_track_media").update({ status: "completed", urls, error_message: null }).eq("id", row.id);
}

export async function markMediaFailed(db: Db, id: string, message: string) {
  await db.from("music_track_media").update({ status: "failed", error_message: translateSunoErrorMessage(message) }).eq("id", id);
}
