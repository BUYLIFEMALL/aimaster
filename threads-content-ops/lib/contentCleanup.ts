import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { retentionCutoff } from "@/threads-content-ops/lib/retention";

// 30일 보관 후 자동 삭제 (v1.76) — 회원의 글감과 보관함 글을 만든 지 30일이 지나면 지운다.
// · 글감(tco_viral_candidates): '보관 중'(archived)으로 표시한 글감은 영구 보관이라 지우지 않는다.
// · 보관함 글(tco_posts): 검토 대기(draft)·발행 실패(failed)만 지운다. 예약 대기(scheduled)와 발행 기록(published)은 지우지 않는다.
// · 첨부 이미지·영상 파일은 올린 지 30일 기준으로 mediaCleanup.ts가 따로 지운다.
// 정책 시작일(2026-10-08) 전에 만든 콘텐츠도 시작일 + 30일(2026-11-07)까지는 유예된다(retentionCutoff가 null이면 아무것도 하지 않음).
// 호출처: 하루 1회 크론(app/api/threads-content-ops/cleanup-media)과 회원이 화면을 열 때의 본인 몫 정리.

export type ContentCleanupResult = { viral: number; posts: number };

export async function cleanupUserContent(service: SupabaseClient, userId: string): Promise<ContentCleanupResult> {
  const cutoff = retentionCutoff();
  if (!cutoff) return { viral: 0, posts: 0 };
  const before = cutoff.toISOString();

  const { data: viral } = await service.from("tco_viral_candidates").delete()
    .eq("user_id", userId).neq("status", "archived").lt("created_at", before).select("id");
  const { data: posts } = await service.from("tco_posts").delete()
    .eq("user_id", userId).in("status", ["draft", "failed"]).lt("created_at", before).select("id");
  return { viral: viral?.length ?? 0, posts: posts?.length ?? 0 };
}
