import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { SunoUsageGuide } from "@/components/guide/SunoUsageGuide";
import { RetentionNotice } from "@/components/RetentionBadge";
import { PlanningListWithPicker, type PickerSong } from "@/components/plannings/PlanningListWithPicker";

export const dynamic = "force-dynamic";

export default async function PlanningsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: plannings }, { data: program }, { data: doneTracks }] = await Promise.all([
    supabase
      .from("music_plannings")
      .select("id, title, song_description, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as unknown as { from: (table: string) => any })
      .from("programs")
      .select("description, short_desc")
      .eq("slug", "music-automation")
      .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
    // v1.30 기획별 완성 곡(곡마다 첫 변주) — 여러 기획을 골라 플레이리스트로 넘길 때 쓴다. 관계가 2개라 !track_id 지정
    supabase
      .from("music_tracks")
      .select("planning_id, created_at, title, mode, style_description, music_track_variants!track_id(id, duration_seconds)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: true }),
  ]);
  // v1.40(D-68-03): 제작 목록 내보내기에 쓰도록 제목·버전·길이·스타일도 함께 넘긴다.
  const songsByPlanning = new Map<string, PickerSong[]>();
  type DoneTrack = { planning_id: string; title: string | null; mode: string; style_description: string | null; music_track_variants: { id: string; duration_seconds: number | null }[] };
  for (const t of (doneTracks ?? []) as unknown as DoneTrack[]) {
    const first = t.music_track_variants?.[0];
    if (!first) continue;
    const song: PickerSong = { id: first.id, title: t.title ?? "제목 없음", mode: t.mode, durationSeconds: first.duration_seconds, style: t.style_description };
    songsByPlanning.set(t.planning_id, [...(songsByPlanning.get(t.planning_id) ?? []), song]);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      <RetentionNotice />
      {/* 상단 헤더 & Suno Create 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🎵</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">내 곡 기획 · 트랙 관리</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Suno V6 Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            주제와 감성을 입력해 맞춤형 음악을 기획하고, Suno 고음질 생성과 MR 분리 및 음원 변환을 진행합니다.
          </p>
        </div>

        <Link
          href="/plannings/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-base leading-none">+</span>
          <span>새 곡 기획하기</span>
        </Link>
      </div>

      {/* 프로그램 안내 카드 (다크 글래스모피즘) */}
      {(program?.description || program?.short_desc) && (
        <div className="mb-6 rounded-2xl border border-[#272732] bg-[#14141b]/90 p-5 shadow-lg shadow-black/30 backdrop-blur-md">
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-2 text-xs sm:text-sm leading-relaxed text-zinc-300 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

      {/* 시각화 가이드 컴포넌트 */}
      <SunoUsageGuide />

      {/* 기획안 리스트 */}
      {!plannings || plannings.length === 0 ? (
        <div className="rounded-2xl border border-[#272732] bg-[#14141b]/80 p-12 text-center text-zinc-400 backdrop-blur-md">
          <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-2xl bg-[#1c1c28] border border-[#2d2d3d] text-3xl">
            🎵
          </div>
          <h3 className="text-base font-bold text-zinc-200 mb-1">아직 기획한 곡이 없습니다</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
            주제, 장르, 무드를 정하고 단 몇 초 만에 완성도 높은 가사와 스타일 프롬프트를 완성해보세요!
          </p>
          <Link
            href="/plannings/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20"
          >
            첫 곡 기획 시작하기
          </Link>
        </div>
      ) : (
        <PlanningListWithPicker plannings={plannings.map((p) => ({ ...p, songs: songsByPlanning.get(p.id) ?? [] }))} />
      )}
    </div>
  );
}
