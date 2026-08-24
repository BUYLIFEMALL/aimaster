import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SyncMediaButton } from "@/components/media/SyncMediaButton";
import { MediaList } from "@/components/media/MediaList";
import { HiddenMediaRow } from "@/components/media/HiddenMediaRow";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function MediaPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: allMedia } = await supabase
    .from("ig_media")
    .select("id, ig_media_id, caption, permalink, thumbnail_url, is_monitored, custom_link, is_hidden")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const media = (allMedia ?? []).filter((m) => !m.is_hidden);
  const hiddenMedia = (allMedia ?? []).filter((m) => m.is_hidden);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">게시물 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          계정을 연결한 뒤 동기화하면 모든 게시물이 기본적으로 댓글 자동 답글 대상으로 등록됩니다.
          원치 않는 게시물은 개별로 꺼두거나, 목록에서 아예 숨길 수 있어요.
        </p>
      </div>

      <div className="mb-6">
        <SyncMediaButton />
      </div>

      {media.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📸</div>
          <p>아직 동기화한 게시물이 없습니다. 먼저 계정을 연결하고 동기화해주세요.</p>
        </div>
      ) : (
        <MediaList media={media} />
      )}

      {hiddenMedia.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-gray-500">
            숨긴 게시물 {hiddenMedia.length}개 보기
          </summary>
          <div className="mt-3 space-y-2">
            {hiddenMedia.map((m) => (
              <HiddenMediaRow key={m.id} media={m} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
