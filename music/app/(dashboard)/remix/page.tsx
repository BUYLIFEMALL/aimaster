import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "@/components/plannings/AutoRefresh";
import { SunoUsageGuide } from "@/components/guide/SunoUsageGuide";
import type { RemixStatus } from "@/types/database.types";
import { withSignedStorageUrls } from "@/lib/storageSign";
import { RetentionNotice } from "@/components/RetentionBadge";

export const dynamic = "force-dynamic";

interface SourceRow {
  id: string;
  kind: "track" | "upload" | "mr";
  title: string;
  created_at: string;
}

interface RemixSummaryRow {
  id: string;
  source_id: string | null;
  second_source_id: string | null;
  status: RemixStatus;
  created_at: string;
  music_track_remix_variants: { image_url: string | null }[];
}

export default async function RemixSourcesPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: sources }, { data: remixes }] = await Promise.all([
    supabase
      .from("music_remix_sources")
      .select("id, kind, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("music_track_remixes")
      .select("id, source_id, second_source_id, status, created_at, music_track_remix_variants(image_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const sourceList = (sources ?? []) as SourceRow[];
  // 비공개 저장소: 대표 커버 이미지를 서명 주소로(lib/storageSign.ts).
  const remixList = await withSignedStorageUrls((remixes ?? []) as unknown as RemixSummaryRow[]);

  // 소스별로 리믹스 개수/최신 상태/대표 이미지를 집계한다.
  // 매시업은 두 번째 원곡에도 함께 센다(두 번째 곡 묶음이 「리믹스 0개」로 보이지 않게).
  const summaryBySource = new Map<
    string,
    { count: number; latestStatus: RemixStatus; thumbnail: string | null; hasGenerating: boolean }
  >();
  for (const remix of remixList) {
    const thumbnail = remix.music_track_remix_variants.find((v) => v.image_url)?.image_url ?? null;
    for (const sourceId of [remix.source_id, remix.second_source_id]) {
      if (!sourceId) continue;
      const existing = summaryBySource.get(sourceId);
      if (existing) {
        existing.count += 1;
        if (remix.status === "generating") existing.hasGenerating = true;
        if (!existing.thumbnail && thumbnail) existing.thumbnail = thumbnail;
      } else {
        summaryBySource.set(sourceId, {
          count: 1,
          latestStatus: remix.status,
          thumbnail,
          hasGenerating: remix.status === "generating",
        });
      }
    }
  }

  const hasGenerating = remixList.some((r) => r.status === "generating");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      <AutoRefresh enabled={hasGenerating} />
      <RetentionNotice />

      {/* 상단 타이틀 & Suno Create 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🎛️</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">음악 Remix 스튜디오</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Suno Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            기존에 생성된 트랙이나 오디오 음원을 다양한 장르와 무드로 새롭게 리메이크합니다.
          </p>
        </div>

        <Link
          href="/remix/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-base leading-none">+</span>
          <span>새 리믹스 시작</span>
        </Link>
      </div>

      {/* 시각화 가이드 컴포넌트 */}
      <SunoUsageGuide />

      {/* 리믹스 소스 카드 목록 */}
      {sourceList.length === 0 ? (
        <div className="rounded-2xl border border-[#272732] bg-[#14141b]/80 p-12 text-center text-zinc-400 backdrop-blur-md">
          <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-2xl bg-[#1c1c28] border border-[#2d2d3d] text-3xl">
            🎛️
          </div>
          <h3 className="text-base font-bold text-zinc-200 mb-1">아직 생성된 리믹스가 없습니다</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
            기존 곡을 선택하거나 원곡 음원을 업로드하여 재즈, 록, EDM, 어쿠스틱 등 새로운 스타일로 리믹스해보세요!
          </p>
          <Link
            href="/remix/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20"
          >
            첫 리믹스 만들기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sourceList.map((source) => {
            const summary = summaryBySource.get(source.id);
            return (
              <Link
                key={source.id}
                href={`/remix/${source.id}`}
                className="group relative rounded-2xl border border-[#272732] bg-[#14141b] p-4 shadow-lg shadow-black/30 hover:border-orange-500/50 hover:bg-[#181824] transition-all duration-200 flex gap-4 items-center overflow-hidden"
              >
                {/* Subtle hover neon bar */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                {summary?.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={summary.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0 ring-1 ring-[#2b2b3b] group-hover:ring-orange-500/30 transition-all"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#1c1c28] border border-[#2b2b3b] flex items-center justify-center text-2xl shrink-0 group-hover:border-orange-500/30 transition-colors">
                    {source.kind === "track" ? "🎵" : source.kind === "mr" ? "🎚️" : "📤"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-zinc-100 truncate group-hover:text-orange-400 transition-colors text-sm">
                    {source.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#20202e] text-zinc-400 border border-[#2a2a3c]">
                      {source.kind === "track" ? "기존 곡" : source.kind === "mr" ? "MR 분리 음원" : "업로드 음원"}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      리믹스 {summary?.count ?? 0}개
                    </span>
                  </div>
                  {summary?.hasGenerating && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>새 리믹스 생성 중...</span>
                    </div>
                  )}
                </div>
                <div className="text-zinc-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all text-xs font-bold">
                  →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
