import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, sanitizeMedia } from "@/threads-content-ops/lib/media";
import { publishToThreads } from "@/threads-content-ops/lib/threadsPublish";

// 예약 발행 실행기 (v1.84) — 회원이 "예약"으로 올려 둔 글(tco_posts.status='scheduled')만 시각이 되면 본인 Threads 계정으로 발행한다.
// 새 글을 만들거나 예약하지 않은 글을 올리지 않는다(예약 자체가 회원의 명시적 허락이다). 호출처: Vercel 크론(1분 간격, CRON_SECRET 필요).
//
// 안전 장치
// · 중복 발행 방지: 상태를 scheduled → publishing으로 "먼저 가져간" 실행만 발행한다(조건부 update). 크론이 겹쳐 돌아도 같은 글을 두 번 올리지 않는다.
// · 24시간 넘게 늦은 예약은 올리지 않고 실패로 돌린다(장애 뒤 오래된 글이 갑자기 올라가는 것을 막는다).
// · 발행 중에 서버가 끊겨 publishing으로 남은 글은 30분 뒤 실패로 돌린다. Threads에 올라갔을 수 있어 자동 재시도하지 않는다.
// · 회원의 이용 권한·계정 연결·토큰 만료·미디어 소유를 매번 다시 확인한다. 취소는 기존 "예약 취소"(scheduled → draft)가 그대로 중단 장치다.

const PROGRAM_SLUG = "threads-content-ops";
const MAX_LATE_MS = 24 * 60 * 60 * 1000;
const STUCK_MS = 30 * 60 * 1000;
const BATCH = 25;

export type DispatchSummary = { recovered: number; due: number; published: number; failed: number; skipped: number };

type DuePost = { id: string; user_id: string; account_id: string; body: string; media: unknown; scheduled_at: string };

export async function dispatchDueScheduledPosts(service: SupabaseClient, options: { deadlineMs?: number } = {}): Promise<DispatchSummary> {
  const startedAt = Date.now();
  const deadlineMs = options.deadlineMs ?? 200_000;
  const summary: DispatchSummary = { recovered: 0, due: 0, published: 0, failed: 0, skipped: 0 };

  // 1) 발행 중에 끊긴 글 정리(예약으로 들어온 글만: scheduled_at이 있고 claim 때 updated_at을 찍어 둔 것).
  const { data: stuck } = await service.from("tco_posts")
    .update({ status: "failed", error_message: "발행 중 서버가 중단돼 결과를 확인하지 못했습니다. Threads에 올라갔는지 확인한 뒤 필요하면 다시 시도해 주세요. 중복 게시를 막으려고 자동으로 다시 올리지 않았습니다." })
    .eq("status", "publishing").not("scheduled_at", "is", null).lt("updated_at", new Date(Date.now() - STUCK_MS).toISOString()).select("id");
  summary.recovered = stuck?.length ?? 0;

  // 2) 시각이 된 예약 글
  const { data: dueRows, error } = await service.from("tco_posts")
    .select("id, user_id, account_id, body, media, scheduled_at")
    .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true }).limit(BATCH);
  if (error) throw new Error("예약 글을 조회하지 못했습니다.");
  const due = (dueRows ?? []) as DuePost[];
  summary.due = due.length;

  const accessByUser = new Map<string, boolean>();

  for (const post of due) {
    if (Date.now() - startedAt > deadlineMs) { summary.skipped += 1; continue; } // 남은 글은 다음 실행에서 처리한다.

    // 3) 이 실행이 글을 먼저 가져간 경우에만 진행한다.
    const { data: claimed } = await service.from("tco_posts")
      .update({ status: "publishing", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", post.id).eq("user_id", post.user_id).eq("status", "scheduled").select("id").maybeSingle();
    if (!claimed) { summary.skipped += 1; continue; }

    const fail = async (message: string) => {
      await service.from("tco_posts").update({ status: "failed", error_message: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", post.id).eq("user_id", post.user_id);
      summary.failed += 1;
    };

    try {
      if (Date.now() - new Date(post.scheduled_at).getTime() > MAX_LATE_MS) {
        await fail("예약 시각이 24시간 넘게 지나 자동으로 올리지 않았습니다. 내용을 확인하고 다시 예약하거나 직접 발행해 주세요.");
        continue;
      }

      if (!accessByUser.has(post.user_id)) {
        accessByUser.set(post.user_id, (await checkProgramAccess(service, post.user_id, PROGRAM_SLUG)).allowed);
      }
      if (!accessByUser.get(post.user_id)) { await fail("프로그램 이용 권한이 확인되지 않아 올리지 않았습니다."); continue; }

      const { data: account } = await service.from("tco_threads_accounts")
        .select("threads_user_id, access_token, token_expires_at").eq("id", post.account_id).eq("user_id", post.user_id).maybeSingle();
      if (!account) { await fail("연결된 Threads 계정을 찾지 못했습니다. 계정을 다시 연결해 주세요."); continue; }
      if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) { await fail("Threads 연결 토큰이 만료되었습니다. 계정을 다시 연결한 뒤 다시 예약해 주세요."); continue; }

      const media = sanitizeMedia(post.user_id, post.media);
      for (const item of media) {
        if (item.type === "IMAGE" && item.size && item.size > MAX_IMAGE_BYTES) throw new Error("8MB를 넘는 이미지는 Threads에 올릴 수 없습니다.");
        if (item.type === "VIDEO" && item.size && item.size > MAX_VIDEO_BYTES) throw new Error("1GB를 넘는 영상은 Threads에 올릴 수 없습니다.");
      }

      const published = await publishToThreads({ threadsUserId: account.threads_user_id, accessToken: account.access_token, text: post.body, media });
      const { error: saveError } = await service.from("tco_posts")
        .update({ status: "published", published_at: new Date().toISOString(), threads_post_id: published.id, permalink: published.permalink, error_message: null, updated_at: new Date().toISOString() })
        .eq("id", post.id).eq("user_id", post.user_id);
      if (saveError) throw new Error("Threads에는 올라갔지만 기록을 저장하지 못했습니다. Threads에서 게시 여부를 확인해 주세요.");
      summary.published += 1;
    } catch (caught) {
      await fail(caught instanceof Error ? caught.message : "예약 발행 중 알 수 없는 오류가 발생했습니다.");
    }
  }
  return summary;
}
