import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ShortsVideoStatus } from "@/types/database.types";

const STATUS_LABELS: Record<ShortsVideoStatus, string> = {
  script_ready: "스크립트 준비됨",
  images_generating: "이미지 생성 중...",
  images_ready: "이미지 생성 완료",
};

export default async function ScriptsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from("shorts_videos")
    .select("id, title, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">영상스크립트 생성</h1>
          <p className="mt-1 text-sm text-neutral-600">
            쇼츠 대상 수집에서 만든 주제로 생성한 영상 스크립트 목록입니다.
          </p>
        </div>
        <Link
          href="/candidates"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          쇼츠 대상에서 새로 만들기
        </Link>
      </div>

      {!videos || videos.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          아직 생성된 영상 스크립트가 없습니다. 먼저 &ldquo;쇼츠 대상 수집&rdquo;에서 주제를 골라
          &ldquo;쇼츠생성&rdquo;을 눌러보세요.
        </div>
      ) : (
        <ul className="space-y-3">
          {videos.map((v) => (
            <li key={v.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/scripts/${v.id}`}
                  className="text-sm font-semibold text-neutral-900 hover:underline"
                >
                  {v.title}
                </Link>
                <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                  {STATUS_LABELS[v.status]}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                {new Date(v.created_at).toLocaleString("ko-KR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
