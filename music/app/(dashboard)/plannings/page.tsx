import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { SunoUsageGuide } from "@/components/guide/SunoUsageGuide";
import type { PlanningStatus } from "@/types/database.types";
import { RetentionNotice } from "@/components/RetentionBadge";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<PlanningStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-[#20202e] text-zinc-400 border border-[#2b2b3d]" },
  planned: { label: "기획 완료", className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  generating: { label: "생성 중...", className: "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse" },
  completed: { label: "완료", className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  error: { label: "오류", className: "bg-rose-500/15 text-rose-400 border border-rose-500/30" },
};

export default async function PlanningsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: plannings }, { data: program }] = await Promise.all([
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
  ]);

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
        <div className="space-y-3">
          {plannings.map((planning) => {
            const badge = STATUS_BADGE[planning.status];
            return (
              <Link
                key={planning.id}
                href={`/plannings/${planning.id}`}
                className="group relative block rounded-2xl border border-[#272732] bg-[#14141b] p-4 sm:p-5 shadow-lg shadow-black/30 hover:border-orange-500/50 hover:bg-[#181824] transition-all duration-200 overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm sm:text-base text-zinc-100 group-hover:text-orange-400 transition-colors truncate">
                        {planning.title ?? "(제목 생성 전)"}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400 truncate leading-relaxed">
                      {planning.song_description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-zinc-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all text-xs font-bold">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
