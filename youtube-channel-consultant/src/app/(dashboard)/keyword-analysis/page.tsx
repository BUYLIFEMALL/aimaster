"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { KeywordAnalysisResult, SearchOrder, SearchRegion } from "@/lib/youtube/types";
import { formatNumber } from "@/lib/youtube/metrics";
import { BarChart, ChartTabs, ShareChart } from "@/components/analysis/Charts";
import { VideoList } from "@/components/analysis/VideoList";
import { AiDrawer, AiEngineBar } from "@/components/ai/AiPanels";
import { useAiEngine, useAiRunner } from "@/components/ai/useAi";
import type { AnalyzedVideo } from "@/lib/youtube/types";
import { ErrorBanner, INPUT_CLASS, MetricTopChart, POPULARITY_NOTE, QuotaNote, SELECT_CLASS, StatBox } from "@/components/analysis/common";

// YouTube 영상 카테고리 ID (videoCategoryId)
const CATEGORIES: { id: string; label: string }[] = [
  { id: "", label: "모든 카테고리" },
  { id: "1", label: "영화/애니메이션" },
  { id: "2", label: "자동차" },
  { id: "10", label: "음악" },
  { id: "15", label: "애완동물/동물" },
  { id: "17", label: "스포츠" },
  { id: "19", label: "여행/이벤트" },
  { id: "20", label: "게임" },
  { id: "22", label: "인물/블로그" },
  { id: "23", label: "코미디" },
  { id: "24", label: "엔터테인먼트" },
  { id: "25", label: "뉴스/정치" },
  { id: "26", label: "노하우/스타일" },
  { id: "27", label: "교육" },
  { id: "28", label: "과학/기술" },
];

const SHARE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#ec4899", "#9ca3af"];

const AGE_BUCKETS: { label: string; maxDays: number }[] = [
  { label: "1일 이내", maxDays: 1 },
  { label: "1주 이내", maxDays: 7 },
  { label: "1개월 이내", maxDays: 30 },
  { label: "3개월 이내", maxDays: 90 },
  { label: "1년 이내", maxDays: 365 },
  { label: "1년 이상", maxDays: Infinity },
];

export default function KeywordAnalysisPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState<SearchRegion>("all");
  const [order, setOrder] = useState<SearchOrder>("viewCount");
  const [categoryId, setCategoryId] = useState("");
  const [pages, setPages] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; needApiKey?: boolean } | null>(null);
  const [result, setResult] = useState<KeywordAnalysisResult | null>(null);

  const estimate = pages * 100 + pages + 2;
  const aiEngine = useAiEngine();
  const ai = useAiRunner(aiEngine.provider, aiEngine.model);

  const run = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube/keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, region, order, categoryId, pages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "키워드 분석에 실패했습니다.", needApiKey: data.needApiKey });
        return;
      }
      setResult(data as KeywordAnalysisResult);
    } catch {
      setError({ message: "네트워크 오류로 분석하지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  };

  const videos = useMemo(() => result?.videos ?? [], [result]);

  const runCompetition = () => {
    if (!result) return;
    const top = [...result.videos].sort((a, b) => b.popularity - a.popularity).slice(0, 30);
    ai.run(
      "keyword-competition",
      { keyword: result.keyword, region, order, totals: result.totals, channelShare: result.channelShare.slice(0, 10), videos: top },
      `AI 경쟁 전략 분석 · ${result.keyword}`
    );
  };
  const summarize = (v: AnalyzedVideo) => ai.run("video-summary", { video: v }, `AI 영상 요약 · ${v.title}`);

  const shareItems = useMemo(() => {
    const list = result?.channelShare ?? [];
    const top = list.slice(0, 10).map((c, i) => ({ label: c.title, value: c.viewCount, color: SHARE_COLORS[i] }));
    const rest = list.slice(10).reduce((s, c) => s + c.viewCount, 0);
    return rest > 0 ? [...top, { label: "기타 채널", value: rest, color: SHARE_COLORS[10] }] : top;
  }, [result]);

  const ageItems = useMemo(() => {
    const counts = AGE_BUCKETS.map(() => 0);
    const now = Date.now();
    for (const v of videos) {
      const days = (now - new Date(v.publishedAt).getTime()) / 86400000;
      const idx = AGE_BUCKETS.findIndex((b) => days <= b.maxDays);
      counts[idx === -1 ? AGE_BUCKETS.length - 1 : idx] += 1;
    }
    return AGE_BUCKETS.map((b, i) => ({ label: b.label, value: counts[i], title: `${b.label}: 영상 ${counts[i]}개` }));
  }, [videos]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-bold text-gray-900">키워드 분석</h1>
        <p className="mt-1 text-sm text-gray-500">키워드로 검색된 영상의 조회수·좋아요·댓글, 채널 점유율, 영상 연령을 분석합니다. 내 YouTube API 키로 조회합니다.</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={INPUT_CLASS} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="분석할 키워드 (예: AI자동화)" maxLength={100} />
            <button type="submit" disabled={loading || !keyword.trim()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              분석
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className={SELECT_CLASS} value={region} onChange={(e) => setRegion(e.target.value as SearchRegion)} aria-label="검색 지역">
              <option value="all">전체 지역</option>
              <option value="kr">한국</option>
              <option value="global">해외(미국·영어)</option>
            </select>
            <select className={SELECT_CLASS} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="카테고리">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select className={SELECT_CLASS} value={order} onChange={(e) => setOrder(e.target.value as SearchOrder)} aria-label="검색 기준">
              <option value="viewCount">조회수 많은 순으로 검색</option>
              <option value="relevance">관련도 순으로 검색</option>
              <option value="date">최신 순으로 검색</option>
            </select>
            <select className={SELECT_CLASS} value={pages} onChange={(e) => setPages(Number(e.target.value) === 2 ? 2 : 1)} aria-label="검색 규모">
              <option value={1}>영상 최대 50개</option>
              <option value={2}>영상 최대 100개</option>
            </select>
          </div>
        </form>
        <p className="mt-2 text-[11px] text-gray-500">
          예상 쿼터 약 {estimate}유닛(검색 1페이지당 100유닛). 지역·카테고리·검색 기준을 바꾸면 새로 검색하므로 쿼터가 다시 듭니다. 아래 결과의 필터·정렬은 쿼터가 들지 않습니다.
        </p>
      </div>

      {error && <ErrorBanner message={error.message} needApiKey={error.needApiKey} />}

      {loading && !result && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> 키워드 검색 결과를 분석하는 중입니다...
        </div>
      )}

      {result && (
        <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">키워드: &quot;{result.keyword}&quot;</p>
                <p className="text-xs text-gray-500">검색 결과 {videos.length}개 영상 분석</p>
              </div>
              <div className="flex flex-1 flex-wrap justify-around gap-2 lg:max-w-xl">
                <StatBox label="총 조회수" value={formatNumber(result.totals.views)} />
                <StatBox label="총 좋아요" value={formatNumber(result.totals.likes)} />
                <StatBox label="총 댓글" value={formatNumber(result.totals.comments)} />
              </div>
            </div>
            <div className="mt-3">
              <QuotaNote used={result.quotaUsed} fetchedAt={result.fetchedAt} />
            </div>
          </section>

          {videos.length === 0 ? (
            <p className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">검색 결과가 없습니다. 키워드나 조건을 바꿔보세요.</p>
          ) : (
            <>
              <AiEngineBar engine={aiEngine} actions={[{ label: "AI 경쟁 전략 분석", onClick: runCompetition }]} />
              <ChartTabs
                title={(label) => (label === "채널 점유율" ? "채널별 조회수 점유율 (상위 10개 채널)" : label === "영상 연령" ? "영상 게시 시기 분포" : `"${result.keyword}" 검색 결과 ${label} 분포 (Top 20)`)}
                tabs={[
                  { key: "popularity", label: "인기 점수", render: () => <><MetricTopChart videos={videos} pick={(v) => v.popularity} formatValue={(n) => n.toFixed(1)} /><p className="mt-3 text-[11px] text-gray-500">{POPULARITY_NOTE}</p></> },
                  { key: "views", label: "조회수", render: () => <MetricTopChart videos={videos} pick={(v) => v.viewCount} /> },
                  { key: "likes", label: "좋아요", render: () => <MetricTopChart videos={videos} pick={(v) => v.likeCount} /> },
                  { key: "comments", label: "댓글", render: () => <MetricTopChart videos={videos} pick={(v) => v.commentCount} /> },
                  { key: "share", label: "채널 점유율", render: () => <ShareChart items={shareItems} formatValue={(n) => formatNumber(n)} /> },
                  { key: "age", label: "영상 연령", render: () => <BarChart items={ageItems} formatValue={(n) => `${n}개`} /> },
                ]}
              />
              <VideoList
                videos={videos}
                showChannel
                onSummarize={summarize}
                summarizeDisabled={!aiEngine.ready}
                onAnalyzeChannel={(channelId) => router.push(`/channel-analysis?q=${encodeURIComponent(channelId)}`)}
                exportName={`keyword-${result.keyword.replace(/[^\w가-힣]+/g, "_")}`}
                exportJson={result}
              />
            </>
          )}
        </div>
      )}
      <AiDrawer state={ai.state} onClose={ai.close} />
    </div>
  );
}
