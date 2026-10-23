import { StudioHeader } from "@/components/ui/StudioHeader";
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
    .from("th_posts")
    .select("id, threads_post_id, text, permalink, is_monitored, custom_link, is_hidden")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const media = (allMedia ?? []).filter((m) => !m.is_hidden);
  const hiddenMedia = (allMedia ?? []).filter((m) => m.is_hidden);

  return (
    <div className="mx-auto max-w-5xl">
      <StudioHeader
        icon="🧵"
        title="게시물 관리"
        description="계정을 연결한 뒤 동기화하면 모든 게시물이 기본으로 자동 답글 대상이 됩니다. 원치 않는 게시물은 개별로 꺼두거나 목록에서 숨길 수 있어요."
      >
        <SyncMediaButton />
      </StudioHeader>

      {media.length === 0 ? (
        <div className="th-card py-16 text-center text-th-muted">
          <div className="text-5xl mb-4">🧵</div>
          <p>아직 동기화한 게시물이 없습니다. 먼저 계정을 연결하고 동기화해주세요.</p>
        </div>
      ) : (
        <MediaList media={media} />
      )}

      {hiddenMedia.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-th-muted">
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
