import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SyncVideosButton } from "@/components/videos/SyncVideosButton";
import { VideosList } from "@/components/videos/VideosList";
import { HiddenVideoRow } from "@/components/videos/HiddenVideoRow";
import { StudioHeader } from "@/components/ui/StudioHeader";

export const dynamic = "force-dynamic";
// 채널 영상이 아주 많으면(실측 1,000개/20페이지) 동기화가 오래 걸릴 수 있어 넉넉히 잡아둔다.
export const maxDuration = 300;

export default async function VideosPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: allVideos } = await supabase
    .from("ytreply_videos")
    .select("id, youtube_video_id, title, thumbnail_url, is_monitored, custom_link, is_hidden")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const videos = (allVideos ?? []).filter((v) => !v.is_hidden);
  const hiddenVideos = (allVideos ?? []).filter((v) => v.is_hidden);

  return (
    <div className="mx-auto max-w-5xl">
      <StudioHeader
        icon="🎬"
        title="영상 관리"
        description="채널을 동기화하면 모든 영상이 기본으로 자동 답글 대상이 됩니다. 원치 않는 영상은 개별로 꺼두거나 목록에서 숨길 수 있어요."
      >
        <SyncVideosButton />
      </StudioHeader>

      {videos.length === 0 ? (
        <div className="yt-card py-16 text-center text-yt-muted">
          <div className="text-5xl mb-4">🎬</div>
          <p>아직 동기화한 영상이 없습니다. 먼저 채널을 연결하고 동기화해주세요.</p>
        </div>
      ) : (
        <VideosList videos={videos} />
      )}

      {hiddenVideos.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-yt-muted">
            숨긴 영상 {hiddenVideos.length}개 보기
          </summary>
          <div className="mt-3 space-y-2">
            {hiddenVideos.map((v) => (
              <HiddenVideoRow key={v.id} video={v} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
