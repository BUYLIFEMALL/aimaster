"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { ChannelAnalysisResult } from "@/lib/youtube/types";
import { formatDate, formatHours, formatNumber } from "@/lib/youtube/metrics";
import { BarChart, ChartTabs, ShareChart } from "@/components/analysis/Charts";
import { VideoList } from "@/components/analysis/VideoList";
import { AiDrawer, AiEngineBar } from "@/components/ai/AiPanels";
import { useAiEngine, useAiRunner } from "@/components/ai/useAi";
import type { AnalyzedVideo } from "@/lib/youtube/types";
import { ErrorBanner, INPUT_CLASS, MetricTopChart, POPULARITY_NOTE, QuotaNote, SELECT_CLASS, StatBox } from "@/components/analysis/common";

const NAME_SEARCH_HINT = "채널 이름으로 찾으면 약 100유닛이 더 듭니다. @핸들이나 채널 주소로 입력하면 1유닛만 듭니다.";

function estimateQuota(query: string, limit: number): number {
  const text = query.trim();
  const isDirect = text.startsWith("@") || /^https?:\/\//i.test(text) || /^(www\.|m\.)?youtube\.com\//i.test(text) || /^UC[\w-]{22}$/.test(text);
  return (isDirect ? 1 : 101) + Math.ceil(limit / 50) * 2;
}

function ChannelAnalysisInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [videoLimit, setVideoLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; needApiKey?: boolean } | null>(null);
  const [result, setResult] = useState<ChannelAnalysisResult | null>(null);
  const autoRan = useRef(false);
  const aiEngine = useAiEngine();
  const ai = useAiRunner(aiEngine.provider, aiEngine.model);

  const run = useCallback(async (q: string, limit: number) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, videoLimit: limit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "채널 분석에 실패했습니다.", needApiKey: data.needApiKey });
        return;
      }
      setResult(data as ChannelAnalysisResult);
    } catch {
      setError({ message: "네트워크 오류로 분석하지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  }, []);

  // 키워드 분석 화면에서 채널명을 눌러 넘어온 경우 한 번만 자동 실행한다.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoRan.current) {
      autoRan.current = true;
      setQuery(q);
      run(q, 50);
    }
  }, [searchParams, run]);

  const videos = useMemo(() => result?.videos ?? [], [result]);

  const timelineItems = useMemo(() => {
    const byMonth = new Map<string, { views: number; count: number }>();
    for (const v of videos) {
      const key = v.publishedAt.slice(0, 7);
      const cur = byMonth.get(key) ?? { views: 0, count: 0 };
      cur.views += v.viewCount;
      cur.count += 1;
      byMonth.set(key, cur);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([month, d]) => ({ label: month.slice(2).replace("-", "."), value: d.views, title: `${month} · 영상 ${d.count}개 · 조회수 합계 ${formatNumber(d.views)}` }));
  }, [videos]);

  // AI에 보낼 채널 요약: 근거 데이터만(최대 60개 영상). 성장 과정은 게시일 순, 나머지는 인기 점수 순.
  const aiChannelPayload = (order: "date" | "popularity") => {
    if (!result) return null;
    const sorted = [...result.videos].sort((a, b) =>
      order === "date" ? new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime() : b.popularity - a.popularity
    );
    const picked = order === "date" ? sorted.slice(-60) : sorted.slice(0, 60);
    return {
      channel: {
        title: result.channel.title,
        handle: result.channel.handle ?? "",
        subscriberCount: result.channel.subscriberCount,
        viewCount: result.channel.viewCount,
        videoCount: result.channel.videoCount,
        publishedAt: result.channel.publishedAt,
        averageIntervalHours: result.uploadStats.averageIntervalHours,
        sinceLastUploadHours: result.uploadStats.sinceLastUploadHours,
      },
      videos: picked,
    };
  };
  const runChannelAi = (type: "channel-competition" | "channel-growth" | "channel-diagnosis", title: string, order: "date" | "popularity") => {
    const payload = aiChannelPayload(order);
    if (payload) ai.run(type, payload, `${title} · ${result?.channel.title ?? ""}`);
  };
  const summarize = (v: AnalyzedVideo) => ai.run("video-summary", { video: v }, `AI 영상 요약 · ${v.title}`);

  const formatStats = useMemo(() => {
    const shorts = videos.filter((v) => v.isShort);
    const longs = videos.filter((v) => !v.isShort);
    const avg = (list: typeof videos) => (list.length ? Math.round(list.reduce((s, v) => s + v.viewCount, 0) / list.length) : 0);
    return { shorts, longs, shortsAvg: avg(shorts), longsAvg: avg(longs) };
  }, [videos]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-bold text-gray-900">채널 분석</h1>
        <p className="mt-1 text-sm text-gray-500">채널 이름·@핸들·채널 주소를 입력하면 채널 지표와 최근 영상별 인기 점수를 분석합니다. 내 YouTube API 키로 조회합니다.</p>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            run(query, videoLimit);
          }}
        >
          <input className={INPUT_CLASS} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="채널 이름, @핸들 또는 채널 주소 (예: @example)" maxLength={200} />
          <select className={SELECT_CLASS} value={videoLimit} onChange={(e) => setVideoLimit(Number(e.target.value))} aria-label="분석할 영상 수">
            <option value={50}>최근 영상 50개</option>
            <option value={100}>최근 영상 100개</option>
            <option value={200}>최근 영상 200개</option>
          </select>
          <button type="submit" disabled={loading || !query.trim()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            분석
          </button>
        </form>
        <p className="mt-2 text-[11px] text-gray-500">
          예상 쿼터 약 {estimateQuota(query || "x", videoLimit)}유닛. {NAME_SEARCH_HINT}
        </p>
      </div>

      {error && <ErrorBanner message={error.message} needApiKey={error.needApiKey} />}

      {loading && !result && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> 채널을 분석하는 중입니다...
        </div>
      )}

      {result && (
        <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {result.channel.thumbnailUrl && <img src={result.channel.thumbnailUrl} alt="" className="h-16 w-16 rounded-full bg-gray-100 object-cover" />}
                <div className="min-w-0">
                  <a href={`https://www.youtube.com/channel/${result.channel.id}`} target="_blank" rel="noopener noreferrer" className="block truncate text-lg font-bold text-gray-900 hover:text-red-700">
                    {result.channel.title}
                  </a>
                  <p className="truncate text-xs text-gray-500">{result.channel.handle ?? "채널 분석 결과"}</p>
                </div>
              </div>
              <div className="flex flex-1 justify-around gap-2 lg:max-w-md">
                <StatBox label="구독자 수" value={formatNumber(result.channel.subscriberCount)} />
                <StatBox label="총 조회수" value={formatNumber(result.channel.viewCount)} />
                <StatBox label="총 영상 수" value={result.channel.videoCount.toLocaleString()} />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
                <dt className="text-gray-500">채널 개설일</dt>
                <dd className="font-medium text-gray-900">{result.channel.publishedAt && new Date(result.channel.publishedAt).getFullYear() >= 2005 ? formatDate(result.channel.publishedAt) : "-"}</dd>
                <dt className="text-gray-500">분석 범위 최초 업로드</dt>
                <dd className="font-medium text-gray-900">{result.uploadStats.oldestPublishedAt ? formatDate(result.uploadStats.oldestPublishedAt) : "-"}</dd>
                <dt className="text-gray-500">평균 업로드 주기</dt>
                <dd className="font-medium text-gray-900">{formatHours(result.uploadStats.averageIntervalHours)}</dd>
                <dt className="text-gray-500">마지막 업로드 후</dt>
                <dd className="font-medium text-gray-900">{formatHours(result.uploadStats.sinceLastUploadHours)}</dd>
              </dl>
            </div>
            {result.candidates.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
                <span>다른 채널을 찾으셨나요?</span>
                {result.candidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setQuery(c.id);
                      run(c.id, videoLimit);
                    }}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-700 hover:border-red-300 hover:text-red-700"
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-1">
              <p className="text-[11px] text-gray-500">
                분석 범위: 최근 업로드 영상 {videos.length}개 기준입니다(채널 전체가 아닙니다). 구독자 수·총 조회수·영상 수는 YouTube 채널 정보 그대로입니다.
              </p>
              <QuotaNote used={result.quotaUsed} fetchedAt={result.fetchedAt} />
            </div>
          </section>

          {videos.length === 0 ? (
            <p className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">공개된 업로드 영상이 없습니다.</p>
          ) : (
            <>
              <AiEngineBar
                engine={aiEngine}
                actions={[
                  { label: "AI 경쟁 전략 분석", onClick: () => runChannelAi("channel-competition", "AI 경쟁 전략 분석", "popularity") },
                  { label: "AI 성장 과정 분석", onClick: () => runChannelAi("channel-growth", "AI 성장 과정 분석", "date") },
                  { label: "AI 채널 진단 및 컨설팅", onClick: () => runChannelAi("channel-diagnosis", "AI 채널 진단 및 컨설팅", "popularity") },
                ]}
              />
              <ChartTabs
                title={(label) => (label === "타임라인" ? "월별 조회수 합계 (게시 월 기준)" : label === "콘텐츠 포맷" ? "콘텐츠 포맷 비율 (쇼츠 추정)" : `${label} 분포 (Top 20)`)}
                tabs={[
                  { key: "popularity", label: "인기 점수", render: () => <><MetricTopChart videos={videos} pick={(v) => v.popularity} formatValue={(n) => n.toFixed(1)} /><p className="mt-3 text-[11px] text-gray-500">{POPULARITY_NOTE}</p></> },
                  { key: "views", label: "조회수", render: () => <MetricTopChart videos={videos} pick={(v) => v.viewCount} /> },
                  { key: "likes", label: "좋아요", render: () => <MetricTopChart videos={videos} pick={(v) => v.likeCount} /> },
                  { key: "comments", label: "댓글", render: () => <MetricTopChart videos={videos} pick={(v) => v.commentCount} /> },
                  { key: "timeline", label: "타임라인", render: () => <BarChart items={timelineItems} formatValue={(n) => formatNumber(n)} /> },
                  {
                    key: "format",
                    label: "콘텐츠 포맷",
                    render: () => (
                      <div className="space-y-4">
                        <ShareChart
                          formatValue={(n) => `${n}개`}
                          items={[
                            { label: "일반 영상", value: formatStats.longs.length, color: "#ef4444" },
                            { label: "쇼츠(추정)", value: formatStats.shorts.length, color: "#f59e0b" },
                          ]}
                        />
                        <p className="text-xs text-gray-600">
                          평균 조회수 — 일반 영상 {formatStats.longs.length ? formatNumber(formatStats.longsAvg) : "-"} · 쇼츠(추정) {formatStats.shorts.length ? formatNumber(formatStats.shortsAvg) : "-"}
                        </p>
                      </div>
                    ),
                  },
                ]}
              />
              <VideoList videos={videos} onSummarize={summarize} summarizeDisabled={!aiEngine.ready} exportName={`channel-${result.channel.id}`} exportJson={result} />
            </>
          )}
        </div>
      )}
      <AiDrawer state={ai.state} onClose={ai.close} />
    </div>
  );
}

export default function ChannelAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <ChannelAnalysisInner />
    </Suspense>
  );
}
