import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SyncCommentsButton } from "@/components/comments/SyncCommentsButton";
import { CommentReviewItem } from "@/components/comments/CommentReviewItem";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 신규 댓글마다 AI 초안 생성이 걸려 다소 시간이 걸릴 수 있음

export default async function CommentsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: comments } = await supabase
    .from("ytreply_comments")
    .select("id, video_id, author_display_name, comment_text, generated_reply, fetched_at")
    .eq("user_id", user.id)
    .eq("status", "pending_review")
    .order("fetched_at", { ascending: false });

  const videoIds = Array.from(new Set((comments ?? []).map((c) => c.video_id)));
  const { data: videos } = await supabase
    .from("ytreply_videos")
    .select("id, title")
    .in("id", videoIds.length > 0 ? videoIds : ["__none__"]);
  const titleByVideoId = new Map((videos ?? []).map((v) => [v.id, v.title]));

  const groupedByVideo = new Map<string, typeof comments>();
  for (const c of comments ?? []) {
    const list = groupedByVideo.get(c.video_id) ?? [];
    list.push(c);
    groupedByVideo.set(c.video_id, list);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">댓글 검토/게시</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI가 만든 답글 초안을 확인하고 수정한 뒤 "게시"를 눌러야 실제로 유튜브에 올라갑니다.
        </p>
      </div>

      <div className="mb-6">
        <SyncCommentsButton />
      </div>

      {!comments || comments.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">💬</div>
          <p>검토 대기 중인 댓글이 없습니다. "지금 새 댓글 확인하기"를 눌러보세요.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groupedByVideo.entries()).map(([videoId, videoComments]) => (
            <div key={videoId}>
              <h2 className="text-sm font-bold text-gray-700 mb-3">
                🎬 {titleByVideoId.get(videoId) ?? "(삭제된 영상)"}
              </h2>
              <div className="space-y-3">
                {(videoComments ?? []).map((c) => (
                  <CommentReviewItem key={c.id} comment={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
