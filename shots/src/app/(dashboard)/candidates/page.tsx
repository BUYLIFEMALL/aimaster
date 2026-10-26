import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsblurLogin, fetchNewsblurFeeds, type NewsblurFeedSummary } from "@/lib/ai/collector";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { CandidateCollector } from "@/components/candidates/CandidateCollector";
import { CandidateList } from "@/components/candidates/CandidateList";
import { MissingApiKeyNotice } from "@/components/settings/MissingApiKeyNotice";
import type { ApiKeyProvider, ShortsSourceType } from "@/types/database.types";
import { APP_VERSION } from "@/lib/version";
import { Play, Sparkles, BookOpen, Layers, Flame, Wand2, Music2, Video, Crosshair } from "lucide-react";

const REQUIRED_PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];

const SOURCE_LABELS: Record<ShortsSourceType, string> = {
  http: "HTTP URL 수집",
  rss: "NewsBlur RSS 피드",
  perplexity: "Perplexity 실시간 검색",
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
      {/* 🎬 헐리우드 시네마틱 뷰파인더 OSD 배너 */}
      <div className="studio-hero">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-rec-pulse" />
              <span>CINEMATIC OSD · REC {APP_VERSION}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/50">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </span>
              <span>유튜브 쇼츠 자동화 스튜디오</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              헐리우드 시네마틱 감성의 바이럴 토픽 수집부터 9:16 비주얼 스토리보드, Suno AI BGM 작곡, WebCodecs 1080p 브라우저 초고속 렌더링까지 올인원으로 완성합니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/guide"
              className="btn-3d-amber px-4 py-2.5 text-xs font-extrabold"
            >
              <BookOpen className="w-4 h-4" />
              <span>제작 매뉴얼 보기</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3대 핵심 KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">바이럴 트렌드 수집</span>
            <span className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {(candidates ?? []).length}
            <span className="text-xs text-slate-400 font-normal ml-1.5">개 후보</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Perplexity Sonar & RSS 피드 실시간 연동
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">9:16 비주얼 스토리보드</span>
            <span className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <Wand2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {(videos ?? []).length}
            <span className="text-xs text-slate-400 font-normal ml-1.5">편 제작완료</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            나노바나나 2.1 6씬 시각 일관성 프롬프트
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Suno AI BGM & 렌더링</span>
            <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <Music2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            Full HD
            <span className="text-xs text-slate-400 font-normal ml-1.5">1080×1920 MP4</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            WebCodecs 브라우저 GPU 가속 합성
          </div>
        </div>
      </div>

      {/* 수집 방식별 카운터 바 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(sourceCounts) as ShortsSourceType[]).map((type) => (
          <div key={type} className="rounded-xl border border-[#202945] bg-[#13182c] p-3.5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-slate-400 font-medium">{SOURCE_LABELS[type]}</div>
              <div className="text-xl font-black text-white mt-0.5">{sourceCounts[type]}건</div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-rec-pulse" />
          </div>
        ))}
      </div>

      {/* API 키 안내 */}
      <MissingApiKeyNotice missing={missingProviders} />

      {/* 수집 위젯 */}
      <div className="rounded-2xl border border-[#202945] bg-[#13182c] p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-4 text-white font-black text-base">
          <Layers className="w-5 h-5 text-rose-500" />
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
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-rec-pulse" />
            <span>수집된 쇼츠 주제 라이브러리</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            총 {(candidates ?? []).length}개의 아이디어 보관 중
          </span>
        </div>
        <CandidateList candidates={candidates ?? []} videoIdByCandidateId={videoIdByCandidateId} />
      </div>
    </div>
  );
}
