"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Search } from "lucide-react";
import type { SearchRegion, TargetChannel, TargetChannelsResult, TargetPeriod } from "@/lib/youtube/types";
import { formatDate, formatNumber } from "@/lib/youtube/metrics";
import { downloadCsv, downloadJson } from "@/lib/export";
import { ErrorBanner, INPUT_CLASS, QuotaNote, SELECT_CLASS } from "@/components/analysis/common";

type SortKey = "powerRatio" | "averageViews" | "subscriberCount";

const SORT_LABELS: Record<SortKey, string> = {
  powerRatio: "파괴력 배수순",
  averageViews: "평균 조회수순",
  subscriberCount: "구독자 적은순",
};

export default function GoldenChannelsPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [maxSubscribers, setMaxSubscribers] = useState(10000);
  const [minAverageViews, setMinAverageViews] = useState(10000);
  const [period, setPeriod] = useState<TargetPeriod>("90d");
  const [shortVideosOnly, setShortVideosOnly] = useState(false);
  const [region, setRegion] = useState<SearchRegion>("kr");
  const [pages, setPages] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; needApiKey?: boolean } | null>(null);
  const [result, setResult] = useState<TargetChannelsResult | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("powerRatio");

  const estimate = pages * 100 + pages + 2;

  const run = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube/golden-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, maxSubscribers, minAverageViews, period, shortVideosOnly, region, pages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "공략 채널 검색에 실패했습니다.", needApiKey: data.needApiKey });
        return;
      }
      setResult(data as TargetChannelsResult);
    } catch {
      setError({ message: "네트워크 오류로 검색하지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo<TargetChannel[]>(() => {
    const list = [...(result?.channels ?? [])];
    if (sortKey === "powerRatio") return list.sort((a, b) => b.powerRatio - a.powerRatio);
    if (sortKey === "averageViews") return list.sort((a, b) => b.averageViews - a.averageViews);
    return list.sort((a, b) => a.subscriberCount - b.subscriberCount);
  }, [result, sortKey]);

  const exportCsv = () => {
    if (!result) return;
    downloadCsv(
      `targets-${result.keyword.replace(/[^\w가-힣]+/g, "_")}.csv`,
      ["순위", "채널", "구독자", "총 조회수", "영상 수", "평균 조회수", "파괴력 배수", "대표 영상", "대표 영상 조회수", "채널 주소"],
      sorted.map((c, i) => [i + 1, c.title, c.subscriberCount, c.viewCount, c.videoCount, c.averageViews, c.powerRatio, c.bestVideo.title, c.bestVideo.viewCount, `https://www.youtube.com/channel/${c.id}`])
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <h1 className="text-xl font-bold text-gray-900">공략 채널 찾기</h1>
        <p className="mt-1 text-sm text-gray-500">
          키워드로 최근 인기 영상을 찾은 뒤, 구독자는 적은데 채널 평균 조회수가 높은 &quot;벤치마킹 타깃&quot; 채널을 골라줍니다. 내 YouTube API 키로 조회합니다.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={INPUT_CLASS} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="찾고 싶은 분야 키워드 (예: AI자동화)" maxLength={100} />
            <button type="submit" disabled={loading || !keyword.trim()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              찾기
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className={SELECT_CLASS} value={maxSubscribers} onChange={(e) => setMaxSubscribers(Number(e.target.value))} aria-label="최대 구독자 수">
              <option value={1000}>구독자 1천 이하</option>
              <option value={5000}>구독자 5천 이하</option>
              <option value={10000}>구독자 1만 이하</option>
              <option value={50000}>구독자 5만 이하</option>
              <option value={100000}>구독자 10만 이하</option>
            </select>
            <select className={SELECT_CLASS} value={minAverageViews} onChange={(e) => setMinAverageViews(Number(e.target.value))} aria-label="최소 평균 조회수">
              <option value={1000}>평균 조회수 1천 이상</option>
              <option value={10000}>평균 조회수 1만 이상</option>
              <option value={30000}>평균 조회수 3만 이상</option>
              <option value={100000}>평균 조회수 10만 이상</option>
            </select>
            <select className={SELECT_CLASS} value={period} onChange={(e) => setPeriod(e.target.value as TargetPeriod)} aria-label="검색 기간">
              <option value="30d">최근 30일 영상</option>
              <option value="90d">최근 90일 영상</option>
              <option value="365d">최근 1년 영상</option>
            </select>
            <select className={SELECT_CLASS} value={shortVideosOnly ? "short" : "all"} onChange={(e) => setShortVideosOnly(e.target.value === "short")} aria-label="영상 길이">
              <option value="all">모든 길이 영상</option>
              <option value="short">4분 미만 짧은 영상만(쇼츠 포함)</option>
            </select>
            <select className={SELECT_CLASS} value={region} onChange={(e) => setRegion(e.target.value as SearchRegion)} aria-label="검색 지역">
              <option value="kr">한국</option>
              <option value="all">전체 지역</option>
              <option value="global">해외(미국·영어)</option>
            </select>
            <select className={SELECT_CLASS} value={pages} onChange={(e) => setPages(Number(e.target.value) === 2 ? 2 : 1)} aria-label="검색 규모">
              <option value={1}>영상 최대 50개 검색</option>
              <option value={2}>영상 최대 100개 검색</option>
            </select>
          </div>
        </form>
        <p className="mt-2 text-[11px] text-gray-500">예상 쿼터 약 {estimate}유닛(검색 1페이지당 100유닛). 조건을 바꿔 다시 찾으면 쿼터가 다시 듭니다. 결과의 정렬은 쿼터가 들지 않습니다.</p>
      </div>

      {error && <ErrorBanner message={error.message} needApiKey={error.needApiKey} />}

      {loading && !result && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> 공략 채널을 찾는 중입니다...
        </div>
      )}

      {result && (
        <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
          <section className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold text-gray-900">
                &quot;{result.keyword}&quot; 검색: 영상 {result.scannedVideos}개 → 채널 {result.scannedChannels}개 중 조건에 맞는 채널 {result.channels.length}개
              </p>
              <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600">
                정렬
                <select className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <option key={k} value={k}>
                      {SORT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => downloadJson(`targets-${result.keyword.replace(/[^\w가-힣]+/g, "_")}.json`, result)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
                <Download size={13} /> JSON 내보내기
              </button>
              <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
                <Download size={13} /> CSV 내보내기
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              평균 조회수 = 채널 전체 누적 조회수 ÷ 영상 수이며 최근 영상의 평균이 아닙니다. 파괴력 배수 = 평균 조회수 ÷ 구독자 수입니다. 이번 검색에 잡힌 채널만 대상이라 시장 전체를 뜻하지 않습니다.
              {result.hiddenSubscriberExcluded > 0 && ` 구독자 수를 비공개한 채널 ${result.hiddenSubscriberExcluded}개는 배수를 계산할 수 없어 제외했습니다.`}
            </p>
            <QuotaNote used={result.quotaUsed} fetchedAt={result.fetchedAt} />
          </section>

          {sorted.length === 0 ? (
            <p className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
              조건에 맞는 채널이 없습니다. 구독자 상한을 올리거나 평균 조회수 기준을 낮추고, 기간을 늘려보세요.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sorted.map((c, i) => (
                <article key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded-full bg-gray-100 object-cover" loading="lazy" /> : <div className="h-14 w-14 shrink-0 rounded-full bg-gray-100" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-gray-400">#{i + 1}</p>
                      <a href={`https://www.youtube.com/channel/${c.id}`} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-bold text-gray-900 hover:text-red-700">
                        {c.title}
                      </a>
                      <p className="truncate text-[11px] text-gray-500">
                        {c.handle ?? ""} {c.publishedAt && new Date(c.publishedAt).getFullYear() >= 2005 ? `· 개설 ${formatDate(c.publishedAt)}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-extrabold text-red-600">{c.powerRatio.toLocaleString()}배</p>
                      <p className="text-[10px] text-gray-500">구독자 대비 파괴력</p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-gray-50 p-2 text-center text-xs">
                    <div>
                      <dt className="text-gray-500">구독자</dt>
                      <dd className="font-bold text-gray-900">{formatNumber(c.subscriberCount)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">평균 조회수</dt>
                      <dd className="font-bold text-gray-900">{formatNumber(c.averageViews)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">총 조회수</dt>
                      <dd className="font-bold text-gray-900">{formatNumber(c.viewCount)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">영상 수</dt>
                      <dd className="font-bold text-gray-900">{c.videoCount.toLocaleString()}</dd>
                    </div>
                  </dl>
                  <a href={`https://www.youtube.com/watch?v=${c.bestVideo.id}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex gap-2 rounded-xl border border-gray-100 p-2 hover:bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.bestVideo.thumbnailUrl} alt="" className="h-14 w-24 shrink-0 rounded-lg bg-gray-100 object-cover" loading="lazy" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-bold text-gray-900">{c.bestVideo.title}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        이번 검색에서 잡힌 대표 영상 · 조회수 {formatNumber(c.bestVideo.viewCount)} · {formatDate(c.bestVideo.publishedAt)}
                        {c.matchedVideos > 1 ? ` · 같은 채널 ${c.matchedVideos}개 영상` : ""}
                      </p>
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => router.push(`/channel-analysis?q=${encodeURIComponent(c.id)}`)}
                    className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    이 채널 분석하기
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
