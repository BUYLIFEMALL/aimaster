import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { GenerateTracksPanel } from "@/components/plannings/GenerateTracksPanel";
import { TrackCard, type TrackCardData } from "@/components/plannings/TrackCard";
import { AutoRefresh } from "@/components/plannings/AutoRefresh";
import { PlanningHeaderCard, type PlanningHeaderData } from "@/components/plannings/PlanningHeaderCard";
import { withSignedStorageUrls } from "@/lib/storageSign";
import { RetentionNotice } from "@/components/RetentionBadge";
import { PlanningExportPicker, type ExportTrack } from "@/components/plannings/PlanningExportPicker";
import { fmtTime } from "@/lib/replaceRange";

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
  // Supabase 생성 타입이 이 테이블의 컬럼을 아직 반영하지 않아 `{}`로 추론된다.
  // 화면에서 실제로 사용하는 기획 헤더 타입으로 명시해 빌드 시 타입 안전성을 유지한다.
  const planningData = planning as PlanningHeaderData;

  // music_tracks.extended_from_variant_id(연장 원본 variant)가 music_track_variants를 가리키는
  // FK가 하나 더 생겨서, music_tracks -> music_track_variants 사이에 관계가 2개(변형 목록 FK인
  // track_id, 연장 원본 FK인 extended_from_variant_id)가 됐다. PostgREST가 어떤 FK로 조인할지
  // 모호해서 에러 없이 조용히 빈 배열을 반환하는 문제가 있었다 — !track_id로 명시해서 해결.
  const { data: tracks } = await supabase
    .from("music_tracks")
    .select("*, music_track_variants!track_id(*, music_track_mr(*), music_track_wav(*)), music_track_media(*)")
    .eq("planning_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // 내 페르소나(2026-10-21 V6 2차 ③): 생성 패널 선택 목록 + 이미 페르소나를 만든 곡 표시
  const { data: personaRows } = await supabase
    .from("music_personas")
    .select("id, name, source_variant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const personas = (personaRows ?? []) as { id: string; name: string; source_variant_id: string | null }[];
  const personaByVariant: Record<string, string> = {};
  for (const p of personas) if (p.source_variant_id) personaByVariant[p.source_variant_id] = p.name;

  // music-audio는 비공개 저장소라 화면에 넘기기 전에 음원·커버·MR·WAV 주소를 1시간짜리 서명 주소로 바꾼다(lib/storageSign.ts).
  const trackList = await withSignedStorageUrls((tracks ?? []) as unknown as TrackCardData[]);
  const hasGeneratingTrack =
    trackList.some((t) => t.status === "generating") ||
    trackList.some((t) => (t.music_track_media ?? []).some((m) => m.status === "generating")) ||
    trackList.some((t) =>
      t.music_track_variants.some(
        (v) => v.music_track_mr.some((mr) => mr.status === "generating") || v.music_track_wav.some((w) => w.status === "generating"),
      ),
    );

  // v1.43: 완성 곡마다 넣을 버전을 화면에서 골라 플레이리스트(v1.26)·목차·CSV(v1.42)로 넘긴다(기본 #1)
  const exportTracks: ExportTrack[] = trackList
    .filter((t) => t.status === "completed" && t.music_track_variants.length > 0)
    .map((t) => {
      const kind = t.extended_from_variant_id
        ? "🔁 연장본 · "
        : t.replaced_from_variant_id
          ? `✂️ 구간 수정본(${fmtTime(Number(t.replace_start_s))}~${fmtTime(Number(t.replace_end_s))}) · `
          : "";
      return {
        id: t.id,
        label: `${kind}${t.title ?? "제목 없음"}`,
        title: t.title ?? "제목 없음",
        mode: t.mode,
        style: (t as TrackCardData & { style_description?: string | null }).style_description ?? null,
        variants: t.music_track_variants.map((v) => ({ id: v.id, durationSeconds: v.duration_seconds })),
      };
    });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <AutoRefresh enabled={hasGeneratingTrack} />

      <Link href="/plannings" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← 기획 목록으로 돌아가기
      </Link>

      <PlanningHeaderCard planning={planningData} />

      <RetentionNotice />

      <GenerateTracksPanel
        planningId={planningData.id}
        planningVocalGender={planningData.vocal_gender}
        planningLang={planningData.lang}
        personas={personas}
      />

      <PlanningExportPicker planningTitle={planningData.title ?? "곡목록"} tracks={exportTracks} />

      {trackList.length > 0 && (
        <div className="space-y-4">
          {trackList.map((track) => (
            <TrackCard key={track.id} track={track} planningLang={planningData.lang} personaByVariant={personaByVariant} personas={personas} />
          ))}
        </div>
      )}
    </div>
  );
}
