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

  // music_tracks.extended_from_variant_id(연장 원본 variant)가 music_track_variants를 가리키는
  // FK가 하나 더 생겨서, music_tracks -> music_track_variants 사이에 관계가 2개(변형 목록 FK인
  // track_id, 연장 원본 FK인 extended_from_variant_id)가 됐다. PostgREST가 어떤 FK로 조인할지
  // 모호해서 에러 없이 조용히 빈 배열을 반환하는 문제가 있었다 — !track_id로 명시해서 해결.
  const { data: tracks } = await supabase
    .from("music_tracks")
    .select("*, music_track_variants!track_id(*, music_track_mr(*), music_track_wav(*))")
    .eq("planning_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const trackList = (tracks ?? []) as unknown as TrackCardData[];
  const hasGeneratingTrack =
    trackList.some((t) => t.status === "generating") ||
    trackList.some((t) =>
      t.music_track_variants.some(
        (v) => v.music_track_mr.some((mr) => mr.status === "generating") || v.music_track_wav.some((w) => w.status === "generating"),
      ),
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <AutoRefresh enabled={hasGeneratingTrack} />

      <Link href="/plannings" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← 기획 목록으로 돌아가기
      </Link>

      <PlanningHeaderCard planning={planning} />

      <GenerateTracksPanel
        planningId={planning.id}
        planningVocalGender={planning.vocal_gender}
        planningLang={planning.lang}
      />

      {trackList.length > 0 && (
        <div className="space-y-4">
          {trackList.map((track) => (
            <TrackCard key={track.id} track={track} planningLang={planning.lang} />
          ))}
        </div>
      )}
    </div>
  );
}
