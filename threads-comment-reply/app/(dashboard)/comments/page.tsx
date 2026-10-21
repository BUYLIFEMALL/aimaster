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
      .from("th_comments")
      .select("id, post_id, author_username, comment_text, generated_reply, fetched_at")
      .eq("user_id", user.id)
      .eq("status", "pending_review")
      .order("fetched_at", { ascending: false }),
    supabase
      .from("th_settings")
      .select("default_link, tone_preset, reply_model, auto_approve, monitoring_enabled, monitoring_interval_minutes, monitoring_started_at, last_run_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const mediaIds = Array.from(new Set((comments ?? []).map((c) => c.post_id)));
  const { data: mediaList } = await supabase
    .from("th_posts")
    .select("id, text")
    .in("id", mediaIds.length > 0 ? mediaIds : ["__none__"]);
  const captionByMediaId = new Map((mediaList ?? []).map((m) => [m.id, m.text]));

  const groupedByMedia = new Map<string, typeof comments>();
  for (const c of comments ?? []) {
    const list = groupedByMedia.get(c.post_id) ?? [];
    list.push(c);
    groupedByMedia.set(c.post_id, list);
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* 스크롤해도 화면 상단에 계속 보이도록 댓글 목록과 분리한 고정 헤더 */}
      <div className="sticky top-[64px] z-10 -mx-4 bg-th-bg px-4 pb-4 pt-1 md:top-0 md:-mx-8 md:px-8">
        <StudioHeader
          icon="💬"
          title="댓글 검토/게시"
          description={'AI가 만든 답글 초안을 확인하고 수정한 뒤 "답변승인"을 눌러야 실제로 쓰레드에 올라갑니다.'}
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
          <div className="th-card py-16 text-center">
            <div className="mb-3 text-5xl">💬</div>
            <p className="text-sm text-th-muted">검토 대기 중인 댓글이 없습니다. 「지금 새 댓글 확인하기」를 눌러보세요.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedByMedia.entries()).map(([mediaId, mediaComments]) => (
              // v1.17: 대시보드 「검토를 기다리는 댓글」에서 #post-<id>로 바로 이동(고정 머리말에 가리지 않게 scroll-mt)
              <section key={mediaId} id={`post-${mediaId}`} className="th-card scroll-mt-80 py-3">
                <h2 className="flex items-center gap-2 border-b border-th-border pb-3 text-sm font-bold text-th-text">
                  <span>🧵</span>
                  <span className="truncate">{captionByMediaId.get(mediaId) || "(삭제된 게시물)"}</span>
                  <span className="ml-auto shrink-0 text-xs font-normal text-th-muted">댓글 {(mediaComments ?? []).length}개</span>
                </h2>
                <div className="divide-y divide-th-border">
                  {(mediaComments ?? []).map((c) => (
                    <CommentReviewItem
                      key={c.id}
                      comment={{
                        id: c.id,
                        author_display_name: c.author_username,
                        comment_text: c.comment_text,
                        generated_reply: c.generated_reply,
                      }}
                    />
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
