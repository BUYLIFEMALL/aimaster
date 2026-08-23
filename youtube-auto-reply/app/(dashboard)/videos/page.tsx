import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SyncVideosButton } from "@/components/videos/SyncVideosButton";
import { VideoRow } from "@/components/videos/VideoRow";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 채널 영상이 많으면 동기화에 다소 시간이 걸릴 수 있음

export default async function VideosPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from("ytreply_videos")
    .select("id, youtube_video_id, title, thumbnail_url, is_monitored, custom_link")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">영상 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          채널을 연결한 뒤 동기화하면 모든 영상이 기본적으로 댓글 자동 답글 대상으로 등록됩니다.
          원치 않는 영상은 개별로 꺼둘 수 있어요.
        </p>
      </div>

      <div className="mb-6">
        <SyncVideosButton />
      </div>

      {!videos || videos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🎬</div>
          <p>아직 동기화한 영상이 없습니다. 먼저 채널을 연결하고 동기화해주세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => (
            <VideoRow key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
