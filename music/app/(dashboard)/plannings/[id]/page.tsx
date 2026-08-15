import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { deletePlanningAction } from "@/lib/actions/plannings";
import { GenerateTracksPanel } from "@/components/plannings/GenerateTracksPanel";
import { TrackCard, type TrackCardData } from "@/components/plannings/TrackCard";
import { AutoRefresh } from "@/components/plannings/AutoRefresh";
import type { PlanningStatus } from "@/types/database.types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<PlanningStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-gray-100 text-gray-600" },
  planned: { label: "기획 완료", className: "bg-blue-100 text-blue-700" },
  generating: { label: "생성 중", className: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", className: "bg-green-100 text-green-700" },
  error: { label: "오류", className: "bg-red-100 text-red-700" },
};

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
  const hasVocalTrack = trackList.some((t) => t.mode === "vocal");
  const hasInstrumentalTrack = trackList.some((t) => t.mode === "instrumental");
  const hasGeneratingTrack = trackList.some((t) => t.status === "generating");
  const badge = STATUS_BADGE[planning.status];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <AutoRefresh enabled={hasGeneratingTrack} />

      <Link href="/plannings" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← 기획 목록으로 돌아가기
      </Link>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-2xl font-black text-gray-900">{planning.title ?? "(제목 생성 전)"}</h1>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">{planning.description}</p>

        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold text-gray-500">곡 설명</dt>
            <dd className="text-gray-700">{planning.song_description}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-500">스타일</dt>
            <dd className="text-gray-700">{planning.style_description}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-500">제외 스타일</dt>
            <dd className="text-gray-700">{planning.exclude_styles}</dd>
          </div>
          <div className="flex gap-6">
            <div>
              <dt className="font-semibold text-gray-500">보컬 성별</dt>
              <dd className="text-gray-700">{planning.vocal_gender ?? "미지정"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-500">언어</dt>
              <dd className="text-gray-700">{planning.lang}</dd>
            </div>
          </div>
        </dl>

        <form action={deletePlanningAction} className="mt-4">
          <input type="hidden" name="planningId" value={planning.id} />
          <button type="submit" className="text-xs text-red-500 hover:text-red-700">
            이 기획 삭제
          </button>
        </form>
      </div>

      <GenerateTracksPanel
        planningId={planning.id}
        hasVocalTrack={hasVocalTrack}
        hasInstrumentalTrack={hasInstrumentalTrack}
      />

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
