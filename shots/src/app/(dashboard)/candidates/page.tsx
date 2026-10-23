import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsblurLogin, fetchNewsblurFeeds, type NewsblurFeedSummary } from "@/lib/ai/collector";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { CandidateCollector } from "@/components/candidates/CandidateCollector";
import { CandidateList } from "@/components/candidates/CandidateList";
import { MissingApiKeyNotice } from "@/components/settings/MissingApiKeyNotice";
import type { ApiKeyProvider, ShortsSourceType } from "@/types/database.types";
import { Play, Sparkles, BookOpen, Layers, Flame, Wand2, Music2 } from "lucide-react";

const REQUIRED_PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];

const SOURCE_LABELS: Record<ShortsSourceType, string> = {
  http: "HTTP URL",
  rss: "RSS 피드",
  perplexity: "Perplexity 검색",
};

export default async function CandidatesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: candidates }, { data: newsblurAccount }, { data: videos }, registeredProviders] =
    await Promise.all([
      supabase
        .from("shorts_candidates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("newsblur_accounts")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("shorts_videos").select("id, candidate_id").eq("user_id", user.id),
      getRegisteredProviders(supabase, user.id),
    ]);

  const videoIdByCandidateId = new Map((videos ?? []).map((v) => [v.candidate_id, v.id]));
  const missingProviders = REQUIRED_PROVIDERS.filter((p) => !registeredProviders.has(p));

  const sourceCounts: Record<ShortsSourceType, number> = { http: 0, rss: 0, perplexity: 0 };
  for (const c of candidates ?? []) {
    sourceCounts[c.source_type] += 1;
  }

  let newsblurFeeds: NewsblurFeedSummary[] = [];
  let newsblurError: string | null = null;
  if (newsblurAccount) {
    try {
      const { data: full } = await supabase
        .from("newsblur_accounts")
        .select("username, password")
        .eq("user_id", user.id)
        .single();
      const sessionCookie = await newsblurLogin(full!.username, full!.password);
      newsblurFeeds = await fetchNewsblurFeeds(sessionCookie);
    } catch (err) {
      newsblurError = err instanceof Error ? err.message : "NewsBlur 피드 목록을 불러오지 못했습니다.";
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 🎬 유튜브 스튜디오 헤더 배너 */}
      <div className="studio-hero">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#ff0000]/15 border border-[#ff0000]/40 text-[#ff4e45] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#ff0000] animate-pulse" />
              YOUTUBE SHORTS STUDIO v1.20
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#f1f1f1] tracking-tight flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#ff0000] flex items-center justify-center shadow-lg shadow-[#ff0000]/40">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </span>
              유튜브 쇼츠 자동화 스튜디오
            </h1>
            <p className="text-sm text-[#aaaaaa] max-w-2xl leading-relaxed">
              최신 바이럴 토픽 수집부터 나노바나나 9:16 씬 스토리보드, Suno AI 테마곡 생성 및 영상 합성까지 올인원으로 완성합니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#272727] hover:bg-[#323232] text-sm font-semibold text-[#f1f1f1] border border-[#3e3e3e] hover:border-[#ff0000]/50 transition-all shadow-md group"
            >
              <BookOpen className="w-4 h-4 text-[#ff4e45] group-hover:scale-110 transition-transform" />
              <span>제작 가이드북</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3대 핵심 KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#aaaaaa]">바이럴 트렌드 수집</span>
            <span className="p-1.5 rounded-lg bg-[#272727] text-[#ff4e45]">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#f1f1f1]">
            {(candidates ?? []).length}
            <span className="text-xs text-[#717171] font-normal ml-1.5">개 후보</span>
          </div>
          <div className="mt-2 text-xs text-[#717171]">
            Perplexity 실시간 검색 & RSS 피드 연동
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#aaaaaa]">9:16 비주얼 스토리보드</span>
            <span className="p-1.5 rounded-lg bg-[#272727] text-amber-400">
              <Wand2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#f1f1f1]">
            {(videos ?? []).length}
            <span className="text-xs text-[#717171] font-normal ml-1.5">편 제작완료</span>
          </div>
          <div className="mt-2 text-xs text-[#717171]">
            나노바나나 2.1 6씬 시각 일관성 프롬프트
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#aaaaaa]">Suno AI BGM & 렌더링</span>
            <span className="p-1.5 rounded-lg bg-[#272727] text-emerald-400">
              <Music2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#f1f1f1]">
            Full HD
            <span className="text-xs text-[#717171] font-normal ml-1.5">1080x1920</span>
          </div>
          <div className="mt-2 text-xs text-[#717171]">
            감성 앰비언트 / 팝 비트 & 자막 자동 믹싱
          </div>
        </div>
      </div>

      {/* 수집 방식별 카운터 바 */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(sourceCounts) as ShortsSourceType[]).map((type) => (
          <div key={type} className="rounded-xl border border-[#272727] bg-[#181818] p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-[#aaaaaa] font-medium">{SOURCE_LABELS[type]}</div>
              <div className="text-xl font-bold text-[#f1f1f1] mt-0.5">{sourceCounts[type]}건</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#ff0000]" />
          </div>
        ))}
      </div>

      {/* API 키 안내 */}
      <MissingApiKeyNotice missing={missingProviders} />

      {/* 수집 위젯 */}
      <div className="rounded-xl border border-[#272727] bg-[#181818] p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4 text-[#f1f1f1] font-bold text-base">
          <Layers className="w-5 h-5 text-[#ff4e45]" />
          <span>신규 쇼츠 주제 수집 및 생성</span>
        </div>
        <CandidateCollector
          newsblurConnected={!!newsblurAccount}
          newsblurUsername={newsblurAccount?.username ?? null}
          newsblurFeeds={newsblurFeeds}
          newsblurError={newsblurError}
        />
      </div>

      {/* 수집된 쇼츠 목록 */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#f1f1f1] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff0000]" />
            수집된 쇼츠 주제 라이브러리
          </h2>
          <span className="text-xs text-[#717171]">
            총 {(candidates ?? []).length}개의 아이디어 보관 중
          </span>
        </div>
        <CandidateList candidates={candidates ?? []} videoIdByCandidateId={videoIdByCandidateId} />
      </div>
    </div>
  );
}
