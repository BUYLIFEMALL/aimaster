import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ShortsVideoStatus } from "@/types/database.types";

const STATUS_LABELS: Record<ShortsVideoStatus, string> = {
  script_ready: "스크립트 준비됨",
  images_generating: "이미지 생성 중...",
  images_ready: "이미지 생성 완료",
};

export default async function ImagesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: videos }, { data: segments }] = await Promise.all([
    supabase
      .from("shorts_videos")
      .select("id, title, full_script, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("shorts_video_segments")
      .select("video_id, segment_index, narration, image_url")
      .eq("user_id", user.id)
      .order("segment_index", { ascending: true }),
  ]);

  const segmentsByVideoId = new Map<string, typeof segments>();
  for (const seg of segments ?? []) {
    const list = segmentsByVideoId.get(seg.video_id) ?? [];
    list.push(seg);
    segmentsByVideoId.set(seg.video_id, list);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">이미지 생성</h1>
        <p className="mt-1 text-sm text-neutral-600">
          지금까지 생성한 대사 스크립트와 장면별 이미지를 한눈에 볼 수 있는 목록입니다.
        </p>
      </div>

      {!videos || videos.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          아직 생성된 스크립트/이미지가 없습니다. &ldquo;영상스크립트 생성&rdquo;에서 먼저 만들어보세요.
        </div>
      ) : (
        <ul className="space-y-4">
          {videos.map((v) => {
            const segs = segmentsByVideoId.get(v.id) ?? [];
            const imageCount = segs.filter((s) => s.image_url).length;
            return (
              <li key={v.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <Link href={`/scripts/${v.id}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                    {v.title}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/scripts/${v.id}`}
                      className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      이미지 수정
                    </Link>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                      {STATUS_LABELS[v.status]}
                    </span>
                  </div>
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-neutral-500">{v.full_script}</p>

                {imageCount > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {segs.map((seg) => (
                      <div key={seg.segment_index} className="w-20">
                        {seg.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={seg.image_url}
                            alt={`장면 ${seg.segment_index}`}
                            className="aspect-9/16 w-20 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex aspect-9/16 w-20 items-center justify-center rounded-md bg-neutral-100 text-[10px] text-neutral-400">
                            미생성
                          </div>
                        )}
                        <p className="mt-0.5 text-center text-[10px] text-neutral-400">#{seg.segment_index}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">아직 생성된 이미지가 없습니다.</p>
                )}

                <p className="mt-3 text-xs text-neutral-400">
                  이미지 {imageCount}/{segs.length}장 · {new Date(v.created_at).toLocaleString("ko-KR")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
