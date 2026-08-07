import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RenderStatus } from "@/types/database.types";

const RENDER_STATUS_LABELS: Record<RenderStatus, string> = {
  rendering: "영상 렌더링 중...",
  ready: "영상 생성 완료",
  failed: "영상 생성 실패",
};

export default async function VideosPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from("shorts_videos")
    .select("id, title, render_status, rendered_video_url, created_at")
    .eq("user_id", user.id)
    .not("render_status", "is", null)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">영상생성</h1>
        <p className="mt-1 text-sm text-neutral-600">
          최종 영상 렌더링을 요청/완료한 쇼츠 목록입니다.
        </p>
      </div>

      {!videos || videos.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          아직 최종 영상을 만든 쇼츠가 없습니다. &ldquo;영상스크립트 생성&rdquo; 결과 페이지 하단의
          &ldquo;쇼츠생성하기&rdquo;에서 만들어보세요.
        </div>
      ) : (
        <ul className="space-y-4">
          {videos.map((v) => (
            <li key={v.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <Link href={`/scripts/${v.id}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                  {v.title}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/scripts/${v.id}`}
                    className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    영상 수정
                  </Link>
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                    {RENDER_STATUS_LABELS[v.render_status!]}
                  </span>
                </div>
              </div>

              {v.render_status === "ready" && v.rendered_video_url ? (
                <div className="space-y-2">
                  <video controls src={v.rendered_video_url} className="max-h-[60vh] w-full rounded-lg bg-black" />
                  <a
                    href={v.rendered_video_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                  >
                    영상 다운로드
                  </a>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  {v.render_status === "rendering" ? "렌더링이 진행 중입니다..." : "렌더링에 실패했습니다."}
                </p>
              )}

              <p className="mt-3 text-xs text-neutral-400">{new Date(v.created_at).toLocaleString("ko-KR")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
