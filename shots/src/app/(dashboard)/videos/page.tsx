import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getYoutubeConnectionStatus } from "@/lib/actions/youtube";
import { PostingSection } from "@/components/candidates/PostingSection";

export default async function VideosPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: videos }, youtubeStatus, { data: instagramAccount }] = await Promise.all([
    supabase
      .from("shorts_videos")
      .select("*")
      .eq("user_id", user.id)
      .eq("render_status", "ready")
      .order("created_at", { ascending: false }),
    getYoutubeConnectionStatus(supabase, user.id),
    supabase.from("instagram_accounts").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">영상 포스팅</h1>
        <p className="mt-1 text-sm text-neutral-600">
          영상 제작까지 완료된 쇼츠 목록입니다. 각 영상 하단에서 유튜브/인스타그램에 바로 올릴 수
          있습니다.
        </p>
      </div>

      {!videos || videos.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          아직 제작이 완료된 쇼츠가 없습니다. &ldquo;영상스크립트 생성&rdquo; 결과 페이지 하단의
          &ldquo;쇼츠생성하기&rdquo;에서 만들어보세요.
        </div>
      ) : (
        <ul className="space-y-8">
          {videos.map((v) => (
            <li key={v.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <Link href={`/scripts/${v.id}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                  {v.title}
                </Link>
                <Link
                  href={`/scripts/${v.id}`}
                  className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  영상 수정
                </Link>
              </div>

              <div className="space-y-2">
                <video controls src={v.rendered_video_url!} className="max-h-[60vh] w-full rounded-lg bg-black" />
                <a
                  href={v.rendered_video_url!}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                >
                  영상 다운로드
                </a>
              </div>

              <p className="mt-3 text-xs text-neutral-400">{new Date(v.created_at).toLocaleString("ko-KR")}</p>

              <div className="mt-4 border-t border-neutral-100 pt-4">
                <PostingSection
                  video={v}
                  youtubeConnected={youtubeStatus.connected}
                  youtubeNeedsReconnect={youtubeStatus.needsReconnect}
                  instagramAccount={instagramAccount ?? null}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
