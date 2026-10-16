import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SyncCommentsButton } from "@/components/comments/SyncCommentsButton";
import { CommentReviewItem } from "@/components/comments/CommentReviewItem";
import { SettingsSummary } from "@/components/comments/SettingsSummary";
import { StudioHeader } from "@/components/ui/StudioHeader";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 신규 댓글마다 AI 초안 생성이 걸려 다소 시간이 걸릴 수 있음

export default async function CommentsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: comments }, { data: settings }] = await Promise.all([
    supabase
      .from("ytreply_comments")
      .select("id, video_id, author_display_name, comment_text, generated_reply, fetched_at")
      .eq("user_id", user.id)
      .eq("status", "pending_review")
      .order("fetched_at", { ascending: false }),
    supabase
      .from("ytreply_settings")
      .select(
        "default_link, tone_preset, reply_model, auto_approve, monitoring_enabled, monitoring_interval_minutes, monitoring_started_at, last_run_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const videoIds = Array.from(new Set((comments ?? []).map((c) => c.video_id)));
  // No UUID sentinel: an empty feed needs no video lookup. Scope title reads to this member too.
  const { data: videos } = videoIds.length > 0
    ? await supabase.from("ytreply_videos").select("id, title").eq("user_id", user.id).in("id", videoIds)
    : { data: [] };
  const titleByVideoId = new Map((videos ?? []).map((v) => [v.id, v.title]));

  const groupedByVideo = new Map<string, typeof comments>();
  for (const c of comments ?? []) {
    const list = groupedByVideo.get(c.video_id) ?? [];
    list.push(c);
    groupedByVideo.set(c.video_id, list);
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* 스크롤해도 화면 상단에 계속 보이도록 댓글 목록과 분리한 고정 헤더 */}
      <div className="sticky top-[64px] z-10 -mx-4 bg-yt-bg px-4 pb-4 pt-1 md:top-0 md:-mx-8 md:px-8">
        <StudioHeader
          icon="💬"
          title="댓글 검토/게시"
          description={'AI가 만든 답글 초안을 확인하고 수정한 뒤 "답변승인"을 눌러야 실제로 유튜브에 올라갑니다.'}
        />

        <SettingsSummary
          data={{
            defaultLink: settings?.default_link ?? null,
            tonePreset: settings?.tone_preset ?? null,
            replyModel: settings?.reply_model ?? null,
            autoApprove: settings?.auto_approve ?? false,
            monitoringEnabled: settings?.monitoring_enabled ?? false,
            monitoringIntervalMinutes: settings?.monitoring_interval_minutes ?? null,
            monitoringStartedAt: settings?.monitoring_started_at ?? null,
            lastRunAt: settings?.last_run_at ?? null,
          }}
        />

        <SyncCommentsButton />
      </div>

      <div className="pt-4">
        {!comments || comments.length === 0 ? (
          <div className="yt-card py-16 text-center">
            <div className="mb-3 text-5xl">💬</div>
            <p className="text-sm text-yt-muted">검토 대기 중인 댓글이 없습니다. 「지금 새 댓글 확인하기」를 눌러보세요.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedByVideo.entries()).map(([videoId, videoComments]) => (
              <section key={videoId} className="yt-card py-3">
                <h2 className="flex items-center gap-2 border-b border-yt-border pb-3 text-sm font-bold text-yt-text">
                  <span className="rounded bg-yt-red px-1.5 py-0.5 text-[10px] text-white">▶</span>
                  <span className="truncate">{titleByVideoId.get(videoId) ?? "(삭제된 영상)"}</span>
                  <span className="ml-auto shrink-0 text-xs font-normal text-yt-muted">댓글 {(videoComments ?? []).length}개</span>
                </h2>
                <div className="divide-y divide-yt-border">
                  {(videoComments ?? []).map((c) => (
                    <CommentReviewItem key={c.id} comment={c} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
