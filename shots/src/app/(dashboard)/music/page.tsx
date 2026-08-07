import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { BgmStatus } from "@/types/database.types";

const BGM_STATUS_LABELS: Record<BgmStatus, string> = {
  processing: "음악 생성 중...",
  ready: "음악 생성 완료",
  failed: "음악 생성 실패",
};

export default async function MusicPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: videos }, { data: tracks }] = await Promise.all([
    supabase
      .from("shorts_videos")
      .select("id, title, bgm_status, bgm_selected_track_id, created_at")
      .eq("user_id", user.id)
      .not("bgm_status", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("shorts_bgm_tracks")
      .select("video_id, id, audio_url, image_url, title, duration_seconds")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const tracksByVideoId = new Map<string, typeof tracks>();
  for (const t of tracks ?? []) {
    const list = tracksByVideoId.get(t.video_id) ?? [];
    list.push(t);
    tracksByVideoId.set(t.video_id, list);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">음악 생성</h1>
        <p className="mt-1 text-sm text-neutral-600">
          지금까지 배경음악 생성을 요청/완료한 영상 목록입니다.
        </p>
      </div>

      {!videos || videos.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          아직 배경음악을 생성한 영상이 없습니다. &ldquo;영상스크립트 생성&rdquo; 결과 페이지 하단에서
          배경음악 생성을 요청해보세요.
        </div>
      ) : (
        <ul className="space-y-4">
          {videos.map((v) => {
            const videoTracks = tracksByVideoId.get(v.id) ?? [];
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
                      음악 수정
                    </Link>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                      {BGM_STATUS_LABELS[v.bgm_status!]}
                    </span>
                  </div>
                </div>

                {videoTracks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {videoTracks.map((track) => {
                      const isSelected = track.id === v.bgm_selected_track_id;
                      return (
                        <div
                          key={track.id}
                          className={`rounded-lg border p-2 ${isSelected ? "border-blue-500 bg-blue-50/40" : "border-neutral-200"}`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            {track.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={track.image_url}
                                alt={track.title ?? "앨범 이미지"}
                                className="h-10 w-10 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 shrink-0 rounded bg-neutral-100" />
                            )}
                            <p className="truncate text-xs font-medium text-neutral-700">
                              {track.title || "제목 없음"}
                              {isSelected && <span className="ml-1 text-blue-600">· 선택됨</span>}
                            </p>
                          </div>
                          <audio controls src={track.audio_url} className="w-full" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">
                    {v.bgm_status === "processing" ? "생성 중입니다..." : "아직 생성된 트랙이 없습니다."}
                  </p>
                )}

                <p className="mt-3 text-xs text-neutral-400">{new Date(v.created_at).toLocaleString("ko-KR")}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
