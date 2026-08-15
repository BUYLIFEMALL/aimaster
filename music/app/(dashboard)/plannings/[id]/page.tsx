import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { GenerateTracksPanel } from "@/components/plannings/GenerateTracksPanel";
import { TrackCard, type TrackCardData } from "@/components/plannings/TrackCard";
import { AutoRefresh } from "@/components/plannings/AutoRefresh";
import { PlanningHeaderCard } from "@/components/plannings/PlanningHeaderCard";

export const dynamic = "force-dynamic";
// 최대 10곡 대량생성 시 GPT 스타일/가사 호출이 순차로 여러 번 도는 generateTracksAction이
// 이 페이지의 Server Action으로 실행되므로, 기본 함수 제한 시간보다 넉넉하게 잡아둔다.
export const maxDuration = 300;

export default async function PlanningDetailPage({ params }: { params: { id: string } }) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: planning } = await supabase
    .from("music_plannings")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!planning) notFound();

  const { data: tracks } = await supabase
    .from("music_tracks")
    .select("*, music_track_variants(*)")
    .eq("planning_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const trackList = (tracks ?? []) as unknown as TrackCardData[];
  const hasGeneratingTrack = trackList.some((t) => t.status === "generating");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <AutoRefresh enabled={hasGeneratingTrack} />

      <Link href="/plannings" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← 기획 목록으로 돌아가기
      </Link>

      <PlanningHeaderCard planning={planning} />

      <GenerateTracksPanel planningId={planning.id} />

      {trackList.length > 0 && (
        <div className="space-y-4">
          {trackList.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}
