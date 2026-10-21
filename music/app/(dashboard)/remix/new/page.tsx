import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RemixForm, type MashupCandidate } from "@/components/remix/RemixForm";
import type { RemixMode } from "@/types/database.types";

export const dynamic = "force-dynamic";

interface RemixSource {
  title: string;
  variantId?: string;
  sourceId?: string;
  mrId?: string;
  mrPart?: "instrumental" | "vocal";
}

const MODES: RemixMode[] = ["cover", "add_vocals", "add_instrumental", "mashup"];

export default async function NewRemixPage({
  searchParams,
}: {
  searchParams: { fromVariantId?: string; sourceId?: string; fromMrId?: string; part?: string; mode?: string };
}) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  let source: RemixSource | null = null;
  let sourceTrackId: string | null = null; // 매시업 후보에서 같은 곡의 다른 변주까지 뺀다(서버가 같은 곡을 거절함).
  const initialMode: RemixMode = MODES.includes(searchParams.mode as RemixMode) ? (searchParams.mode as RemixMode) : "cover";

  if (searchParams.fromMrId) {
    // 곡 카드 MR 결과 바로가기 — 분리된 반주(보컬 추가용) 또는 보컬(반주 추가용)을 원곡으로 쓴다.
    const part = searchParams.part === "vocal" ? "vocal" : "instrumental";
    const { data: mr } = await supabase
      .from("music_track_mr")
      .select("id, variant_id, status")
      .eq("id", searchParams.fromMrId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (mr?.status === "completed") {
      const { data: variant } = await supabase.from("music_track_variants").select("track_id").eq("id", mr.variant_id).maybeSingle();
      const { data: track } = variant
        ? await supabase.from("music_tracks").select("title").eq("id", variant.track_id).maybeSingle()
        : { data: null };
      source = { mrId: mr.id, mrPart: part, title: `${track?.title ?? "제목 없음"} (${part === "vocal" ? "보컬" : "반주"})` };
    }
  } else if (searchParams.sourceId) {
    // 이미 만든 리믹스 원본 그룹에 새 시도를 추가하는 경우 — 재업로드/재선택 불필요.
    const { data: existingSource } = await supabase
      .from("music_remix_sources")
      .select("id, title")
      .eq("id", searchParams.sourceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingSource) {
      source = { sourceId: existingSource.id, title: existingSource.title };
    }
  } else if (searchParams.fromVariantId) {
    const { data: variant } = await supabase
      .from("music_track_variants")
      .select("id, track_id")
      .eq("id", searchParams.fromVariantId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (variant) {
      const { data: track } = await supabase.from("music_tracks").select("title").eq("id", variant.track_id).maybeSingle();
      source = { variantId: variant.id, title: track?.title ?? "제목 없음" };
      sourceTrackId = variant.track_id;
    }
  }

  // 매시업 두 번째 곡 후보: 내 완성 곡 변주(최근 60개).
  const { data: variants } = await supabase
    .from("music_track_variants")
    .select("id, track_id, duration_seconds, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  const trackIds = Array.from(new Set((variants ?? []).map((v) => v.track_id)));
  const { data: tracks } = trackIds.length
    ? await supabase.from("music_tracks").select("id, title").in("id", trackIds)
    : { data: [] as { id: string; title: string | null }[] };
  const titleById = new Map((tracks ?? []).map((t) => [t.id, t.title ?? "제목 없음"]));
  const countByTrack = new Map<string, number>();
  const mashupCandidates: MashupCandidate[] = (variants ?? [])
    .filter((v) => v.track_id !== sourceTrackId)
    .map((v) => {
      const n = (countByTrack.get(v.track_id) ?? 0) + 1;
      countByTrack.set(v.track_id, n);
      const sec = v.duration_seconds ?? 0;
      const len = sec ? ` · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : "";
      // 같은 제목 곡이 많으면 구분이 어려워 만든 날짜·시각(한국 시간)을 붙인다.
      const made = new Date(new Date(v.created_at).getTime() + 9 * 3600 * 1000).toISOString();
      const when = ` · ${made.slice(5, 7)}/${made.slice(8, 10)} ${made.slice(11, 16)}`;
      return { variantId: v.id, label: `${titleById.get(v.track_id) ?? "제목 없음"} (${n})${len}${when}` };
    });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="mb-6">
        <Link
          href="/remix"
          className="text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors inline-flex items-center gap-1 mb-4"
        >
          <span>← 리믹스 목록으로 돌아가기</span>
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎛️</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">새 리믹스 생성</h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          원곡을 기반으로 원하는 분위기, 장르, 보컬 스타일을 입력해 Suno AI 엔진으로 새롭게 재해석합니다.
        </p>
      </div>

      <RemixForm source={source} initialMode={initialMode} mashupCandidates={mashupCandidates} />
    </div>
  );
}
