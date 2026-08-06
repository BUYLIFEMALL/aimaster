import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ScriptEditor } from "@/components/candidates/ScriptEditor";

export default async function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: videoId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: video } = await supabase
    .from("shorts_videos")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .maybeSingle();

  if (!video) notFound();

  const { data: segments } = await supabase
    .from("shorts_video_segments")
    .select("*")
    .eq("user_id", user.id)
    .eq("video_id", video.id)
    .order("segment_index", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">영상스크립트 생성 결과</h1>
      <p className="mb-6 text-sm text-neutral-600">
        생성된 스크립트와 장면별 대사·이미지 프롬프트를 확인하고 필요하면 수정하세요. 수정 후
        저장하면 그 내용으로 이미지가 생성됩니다.
      </p>
      <ScriptEditor video={video} segments={segments ?? []} />
    </div>
  );
}
