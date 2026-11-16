"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Flame, Loader2, Search, Sparkles, TrendingUp } from "lucide-react";
import { BarChart, ChartTabs } from "@/components/analysis/Charts";
import { ErrorBanner, INPUT_CLASS, SELECT_CLASS } from "@/components/analysis/common";
import { ScatterPlot } from "@/components/finder/ScatterPlot";
import { AI_ENGINES } from "@/lib/ai/models";
import type { FinderFormat, FinderVideo, MarketAnalytics } from "@/lib/youtube/boks/core";
import type { TrendResult } from "@/lib/youtube/boks/trends";
import type { UsageSnapshot } from "@/lib/youtube/boks/quota";
import type { PlanReport } from "@/lib/youtube/boks/plan";

// 떡상 시장 탐색 (v1.30) — 외부 오픈소스 boks-youtube-finder(MIT, 커밋 3aacecf)의 판정·필터·시장 분석을 이식한 화면.

type ExcludeKey = "live" | "format" | "spam" | "language" | "offtopic" | "religion";
interface FinderResponse {
  mode: "search" | "chart";
  query: string;
  videos: FinderVideo[];
  excluded: Record<ExcludeKey, number>;
  excludedItems: { id: string; reason: ExcludeKey; title: string; channelTitle: string; viewCount: number }[];
  baseline: { channels: number; cached: number; fetched: number; failed: number; quotaHit: boolean; channelFailed?: boolean };
  format: FinderFormat;
  searchCalls: number;
  searchInfo: { calls: number; topupStopped: boolean; source: "search" | "chart" };
  unitsUsed: number;
  market: MarketAnalytics;
  trends: TrendResult;
  usage: UsageSnapshot & { tracked: boolean };
  fetchedAt: string;
}

const EXCLUDE_LABELS: Record<ExcludeKey, string> = {
  live: "라이브·예정", format: "형식 다름", spam: "해시태그 도배", language: "다른 언어", offtopic: "키워드 무관", religion: "종교 영상",
};

const CATEGORIES = [
  { id: "0", label: "모든 주제" }, { id: "10", label: "음악" }, { id: "20", label: "게임" }, { id: "24", label: "엔터테인먼트" },
  { id: "22", label: "인물/블로그" }, { id: "26", label: "노하우/스타일" }, { id: "27", label: "교육" }, { id: "28", label: "과학기술" },
  { id: "17", label: "스포츠" }, { id: "15", label: "반려동물/동물" }, { id: "19", label: "여행/이벤트" }, { id: "2", label: "자동차" },
  { id: "23", label: "코미디" }, { id: "25", label: "뉴스/정치" },
];

// 인기 차트 빠른 시작(검색 횟수 0, 페이지당 1유닛) — 원본 renderer.js PRESETS 참고
const PRESETS = [
  { label: "🇰🇷 한국 지금 인기", regionCode: "KR", categoryId: "0", relevanceLanguage: "ko" },
  { label: "🎵 한국 음악", regionCode: "KR", categoryId: "10", relevanceLanguage: "ko" },
  { label: "🎮 한국 게임", regionCode: "KR", categoryId: "20", relevanceLanguage: "ko" },
  { label: "🎬 한국 엔터", regionCode: "KR", categoryId: "24", relevanceLanguage: "ko" },
  { label: "💄 한국 노하우·스타일", regionCode: "KR", categoryId: "26", relevanceLanguage: "ko" },
  { label: "🇺🇸 미국 지금 인기", regionCode: "US", categoryId: "0", relevanceLanguage: "en" },
];

const SORTS = [
  { key: "score", label: "평소 대비 배수" }, { key: "subs", label: "구독자 대비 배수" }, { key: "views", label: "조회수" },
  { key: "perDay", label: "하루 조회수" }, { key: "recent", label: "최신순" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const TONE: Record<MarketAnalytics["opportunityTone"], string> = {
  good: "text-yt-success border-yt-success/40 bg-yt-success/10",
  mid: "text-yt-warn border-yt-warn/40 bg-yt-warn/10",
  bad: "text-yt-danger border-yt-danger/40 bg-yt-danger/10",
  neutral: "text-yt-muted border-yt-border bg-yt-raised",
};

const claudeModels = AI_ENGINES.find((e) => e.provider === "anthropic")?.models ?? [];

function searchEstimate(format: FinderFormat) {
  const buckets = format === "all" ? 3 : format === "long" ? 2 : 1;
  return { min: buckets * 100, max: buckets * 100 * (format === "shorts" ? 3 : 2) };
}

export default function ViralFinderPage() {
  const [mode, setMode] = useState<"search" | "chart">("search");
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<FinderFormat>("all");
  const [period, setPeriod] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [regionCode, setRegionCode] = useState("KR");
  const [relevanceLanguage, setRelevanceLanguage] = useState("ko");
  const [categoryId, setCategoryId] = useState("0");
  const [order, setOrder] = useState<"viewCount" | "relevance">("viewCount");
  const [langOnly, setLangOnly] = useState(true);
  const [includeReligion, setIncludeReligion] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; needApiKey?: boolean } | null>(null);
  const [result, setResult] = useState<FinderResponse | null>(null);
  const [usage, setUsage] = useState<(UsageSnapshot & { tracked: boolean }) | null>(null);

  // 목록 필터·정렬(쿼터 0)
  const [onlyOutliers, setOnlyOutliers] = useState(false);
  const [kwFilter, setKwFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [showExcluded, setShowExcluded] = useState(false);

  // AI 기획안
  const [planModel, setPlanModel] = useState(claudeModels[0]?.value ?? "");
  const [plan, setPlan] = useState<{ loading: boolean; error: string | null; needApiKey?: boolean; report: PlanReport | null }>({ loading: false, error: null, report: null });

  useEffect(() => {
    fetch("/api/youtube/viral-finder").then((r) => r.json()).then((d) => d?.usage && setUsage(d.usage)).catch(() => undefined);
  }, []);

  const run = async (override?: Partial<{ mode: "search" | "chart"; regionCode: string; categoryId: string; relevanceLanguage: string }>) => {
    const m = override?.mode ?? mode;
    if (m === "search" && !query.trim() && categoryId === "0") {
      setError({ message: "키워드를 입력하거나 주제를 고른 뒤 검색해 주세요. 키워드 없이 보려면 인기 차트를 쓰세요(검색 횟수 0)." });
      return;
    }
    setLoading(true);
    setError(null);
    setPlan({ loading: false, error: null, report: null });
    try {
      const res = await fetch("/api/youtube/viral-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: m, query, format, period, from, to, order, langOnly, includeReligion,
          regionCode: override?.regionCode ?? regionCode,
          categoryId: override?.categoryId ?? categoryId,
          relevanceLanguage: override?.relevanceLanguage ?? relevanceLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "떡상 탐색에 실패했습니다.", needApiKey: data.needApiKey });
        return;
      }
      setResult(data as FinderResponse);
      setUsage(data.usage);
      setKwFilter("");
    } catch {
      setError({ message: "네트워크 오류로 탐색하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setLoading(false);
    }
  };

  const shown = useMemo(() => {
    let list = result?.videos ?? [];
    if (onlyOutliers) list = list.filter((v) => v.qualifies && (v.score as number) >= 3);
    if (kwFilter) list = list.filter((v) => v.title.toLowerCase().includes(kwFilter.toLowerCase()));
    const val = (v: FinderVideo): number =>
      sort === "score" ? v.score ?? -1 : sort === "subs" ? v.subsRatio ?? -1 : sort === "views" ? v.viewCount : sort === "perDay" ? v.viewsPerDay : Date.parse(v.publishedAt);
    return [...list].sort((a, b) => val(b) - val(a));
  }, [result, onlyOutliers, kwFilter, sort]);

  const makePlan = async () => {
    if (!result) return;
    setPlan({ loading: true, error: null, report: null });
    try {
      const res = await fetch("/api/ai/viral-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: planModel, keyword: result.query || "인기 차트", format: result.format, videos: result.videos, trends: result.trends }),
      });
      const data = await res.json();
      if (!res.ok) setPlan({ loading: false, error: data.error || "기획안을 만들지 못했습니다.", needApiKey: data.needApiKey, report: null });
      else setPlan({ loading: false, error: null, report: data.report });
    } catch {
      setPlan({ loading: false, error: "네트워크 오류로 기획안을 만들지 못했습니다.", report: null });
    }
  };

  const est = searchEstimate(format);
  const remaining = usage ? Math.max(0, usage.searchLimit - usage.search) : null;
  const m = result?.market;
  const t = result?.trends;
  const excludedTotal = result ? Object.values(result.excluded).reduce((s, n) => s + n, 0) : 0;
  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => undefined);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-yt-border bg-yt-surface p-6 shadow-xs">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-yt-text"><Flame className="h-6 w-6 text-yt-red" /> 떡상 시장 탐색</h1>
        <p className="mt-1 text-sm text-yt-muted">
          채널의 <b className="text-yt-text">평소 조회수(최근 같은 형식 영상 중앙값)</b>보다 몇 배 터졌는지로 진짜 떡상 영상을 찾고, 시장 진입 기회·제목 패턴·올리기 좋은 요일까지 숫자로 보여 드립니다. 내 YouTube API 키로 조회합니다.
        </p>

        <div className="mt-4 inline-flex rounded-xl border border-yt-border bg-yt-raised p-1 text-sm">
          {(["search", "chart"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-lg px-4 py-1.5 font-bold ${mode === k ? "bg-yt-red text-white" : "text-yt-muted hover:text-yt-text"}`}>
              {k === "search" ? "🔍 키워드 검색" : "📈 인기 차트(검색 횟수 0)"}
            </button>
          ))}
        </div>

        {mode === "chart" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" disabled={loading} onClick={() => { setRegionCode(p.regionCode); setCategoryId(p.categoryId); setRelevanceLanguage(p.relevanceLanguage); run({ mode: "chart", ...p }); }}
                className="rounded-full border border-yt-border bg-yt-raised px-3 py-1.5 text-xs font-bold text-yt-text hover:border-yt-red disabled:opacity-50">
                {p.label}
              </button>
            ))}
          </div>
        )}

        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); run(); }}>
          {mode === "search" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className={INPUT_CLASS} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="찾을 키워드 (예: 자취요리, 캠핑 장비)" maxLength={100} />
              <button type="submit" disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-yt-red px-6 py-2.5 text-sm font-bold text-white hover:bg-yt-red-hover disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} 떡상 찾기
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <select className={SELECT_CLASS} value={format} onChange={(e) => setFormat(e.target.value as FinderFormat)} aria-label="형식">
              <option value="all">쇼츠·롱폼 전체</option>
              <option value="shorts">쇼츠만(3분 이하)</option>
              <option value="long">롱폼만</option>
            </select>
            {mode === "search" && (
              <select className={SELECT_CLASS} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="업로드 기간">
                <option value="24h">최근 24시간</option><option value="3d">최근 3일</option><option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option><option value="90d">최근 90일</option><option value="1y">최근 1년</option>
                <option value="all">전체 기간</option><option value="custom">직접 지정</option>
              </select>
            )}
            {mode === "search" && period === "custom" && (
              <>
                <input type="date" className={SELECT_CLASS} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="시작일" />
                <input type="date" className={SELECT_CLASS} value={to} onChange={(e) => setTo(e.target.value)} aria-label="종료일" />
              </>
            )}
            <select className={SELECT_CLASS} value={regionCode} onChange={(e) => setRegionCode(e.target.value)} aria-label="국가">
              <option value="KR">한국</option><option value="US">미국</option><option value="JP">일본</option><option value="GB">영국</option>
              <option value="IN">인도</option><option value="VN">베트남</option><option value="TW">대만</option><option value="ALL">국가 무관</option>
            </select>
            <select className={SELECT_CLASS} value={relevanceLanguage} onChange={(e) => setRelevanceLanguage(e.target.value)} aria-label="언어">
              <option value="ko">한국어</option><option value="en">영어</option><option value="ja">일본어</option><option value="zh">중국어</option>
              <option value="vi">베트남어</option><option value="th">태국어</option><option value="hi">힌디어</option><option value="ALL">언어 무관</option>
            </select>
            <select className={SELECT_CLASS} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="주제">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {mode === "search" && (
              <select className={SELECT_CLASS} value={order} onChange={(e) => setOrder(e.target.value as "viewCount" | "relevance")} aria-label="검색 기준">
                <option value="viewCount">조회수 많은 순</option><option value="relevance">관련도 순</option>
              </select>
            )}
            {mode === "chart" && (
              <button type="button" disabled={loading} onClick={() => run()} className="inline-flex items-center gap-2 rounded-xl bg-yt-red px-5 py-2.5 text-sm font-bold text-white hover:bg-yt-red-hover disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />} 이 조건으로 인기 차트 보기
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-yt-muted">
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={langOnly} onChange={(e) => setLangOnly(e.target.checked)} /> 고른 언어 영상만(해외 스팸 거르기)</label>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={!includeReligion} onChange={(e) => setIncludeReligion(!e.target.checked)} /> 종교 영상 빼기(검색어가 종교면 자동 해제)</label>
          </div>
        </form>
        <p className="mt-2 text-[11px] text-yt-muted">
          {mode === "search"
            ? `예상 사용량: 검색 ${est.min / 100}~${est.max / 100}회(약 ${est.min}~${est.max}유닛) + 평소 조회수 계산 약 50~80유닛(같은 채널은 24시간 재사용).`
            : "인기 차트는 검색을 쓰지 않습니다(약 2유닛) + 평소 조회수 계산 약 50~80유닛."}
          {usage && (usage.tracked
            ? ` · 오늘 이 키 사용: 검색 ${usage.search}/${usage.searchLimit}회(남은 ${remaining}회) · 조회 ${usage.units.toLocaleString()}유닛 · 초기화 ${new Date(usage.resetAt).toLocaleString("ko-KR", { hour: "numeric", minute: "2-digit" })}`
            : " · 사용량 누적 기록은 준비 중입니다(이번 검색 사용량은 결과에 표시).")}
        </p>
      </div>

      {error && <ErrorBanner message={error.message} needApiKey={error.needApiKey} />}
      {loading && !result && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-yt-muted"><Loader2 className="h-5 w-5 animate-spin" /> 영상을 찾고 채널 평소 조회수를 계산하는 중입니다...</div>
      )}

      {result && m && t && (
        <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          {/* 시장 요약 */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className={`rounded-2xl border p-5 ${TONE[m.opportunityTone]}`}>
              <p className="text-xs font-bold">시장 진입 기회 지수</p>
              <p className="mt-1 text-4xl font-extrabold">{m.opportunityScore}<span className="text-base font-bold"> / 100 · {m.opportunityLevel}</span></p>
              <p className="mt-2 text-sm text-yt-text">{m.opportunityAdvice}</p>
              <p className="mt-2 text-[11px] text-yt-muted">= 구독 2만 이하 채널 영상 비중×60 + 그중 떡상 비중×2(최대 1)×40 · 소형 채널 {m.smallChannelShare}% · 소형 떡상 {m.smallOutlierCount}개 · 구독자 중앙값 {m.medianSubscribersFormatted}</p>
            </div>
            <div className="rounded-2xl border border-yt-border bg-yt-surface p-5 lg:col-span-2">
              <div className="flex flex-wrap gap-6">
                <Stat label="분석 영상" value={`${result.videos.length}개`} />
                <Stat label="떡상 영상" value={`${m.outlierCount}개`} />
                <Stat label="최고 배수" value={m.maxMultiplierFormatted} />
                <Stat label="평균 조회수" value={m.avgViewsFormatted} />
                <Stat label="평소 대비 계산" value={`${m.baselineCount}개`} />
                <Stat label="구독자 추정" value={`${m.estimatedCount}개`} />
              </div>
              {m.topKeywords.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-yt-muted">제목 키워드 TOP ({m.keywordBasis === "outliers" ? `떡상 영상 ${m.keywordBasisCount}개 기준` : "전체 제목 기준"}) — 누르면 목록이 걸러집니다</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.topKeywords.map((k) => (
                      <button key={k.word} type="button" onClick={() => setKwFilter(kwFilter === k.word ? "" : k.word)}
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${kwFilter === k.word ? "border-yt-red bg-yt-red text-white" : "border-yt-border bg-yt-raised text-yt-text"}`}>
                        {k.word} <span className="opacity-70">{k.percent}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 text-[11px] text-yt-muted">
                이번 사용량: 검색 {result.searchCalls}회 · 약 {result.unitsUsed.toLocaleString()}유닛 · 채널 {result.baseline.channels}개 중 {result.baseline.cached}개 재사용·{result.baseline.fetched}개 새로 계산
                {result.baseline.quotaHit ? " · 한도 초과로 일부 채널은 구독자 대비로 추정" : ""}
                {result.searchInfo.topupStopped ? " · 남은 검색 횟수가 적어 보충 검색을 멈춤" : ""}
              </p>
            </div>
          </section>

          {/* 자동 결론 */}
          {t.findings.length > 0 && (
            <section className="rounded-2xl border border-yt-gold/40 bg-yt-gold/10 p-5">
              <p className="text-sm font-bold text-yt-gold">📌 데이터가 말해 주는 결론</p>
              <ul className="mt-2 space-y-1.5 text-sm text-yt-text">
                {t.findings.map((f) => <li key={f.key}>• {f.text}</li>)}
              </ul>
            </section>
          )}

          {/* 차트 */}
          <ChartTabs
            title={(label) => label}
            tabs={[
              { key: "scatter", label: "떡상 산점도", render: () => <ScatterPlot videos={result.videos} /> },
              { key: "weekday", label: "요일별 평소 대비", render: () => <GroupChart groups={t.weekday} /> },
              { key: "hours", label: "시간대별(한국)", render: () => <GroupChart groups={t.hours} /> },
              { key: "duration", label: "길이별", render: () => <GroupChart groups={[...(result.format !== "long" ? t.durations.shorts : []), ...(result.format !== "shorts" ? t.durations.long : [])]} /> },
              { key: "tiers", label: "채널 규모별", render: () => <GroupChart groups={t.channelTiers} /> },
              { key: "title", label: "제목 패턴", render: () => (
                <div className="space-y-2 text-sm">
                  {t.titlePatterns.features.map((f) => (
                    <div key={f.key} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-yt-muted">{f.label}</span>
                      <div className="h-2.5 flex-1 rounded bg-yt-raised"><div className="h-2.5 rounded bg-yt-red" style={{ width: `${f.outlierPct}%` }} /></div>
                      <span className="w-40 shrink-0 text-right text-xs text-yt-muted">떡상 {f.outlierPct}% · 그 외 {f.otherPct}%</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-yt-muted">제목 길이 중앙값: 떡상 {t.titlePatterns.outlierTitleLength ?? "-"}자 · 그 외 {t.titlePatterns.otherTitleLength ?? "-"}자</p>
                </div>
              ) },
            ]}
          />

          {/* 태그 */}
          {t.topTags.length > 0 && (
            <section className="rounded-2xl border border-yt-border bg-yt-surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-yt-text">자주 쓰인 태그 TOP {t.topTags.length} <span className="text-xs font-normal text-yt-muted">(태그 있는 영상 {t.taggedVideos}개)</span></p>
                <button type="button" onClick={() => copy(t.topTags.map((x) => x.tag).join(", "))} className="inline-flex items-center gap-1 text-xs font-bold text-yt-link"><Copy className="h-3.5 w-3.5" /> 전체 복사</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.topTags.map((x) => <span key={x.tag} className="rounded-full bg-yt-raised px-2.5 py-1 text-xs text-yt-text">#{x.tag} <span className="text-yt-muted">{x.count}{x.outlierCount ? ` · 떡상 ${x.outlierCount}` : ""}</span></span>)}
              </div>
            </section>
          )}

          {/* AI 기획안 */}
          <section className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-300"><Sparkles size={15} /> 근거 수치 기반 AI 기획안</span>
              <select className={SELECT_CLASS} value={planModel} onChange={(e) => setPlanModel(e.target.value)} aria-label="Claude 모델">
                {claudeModels.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
              <button type="button" disabled={plan.loading || result.videos.length === 0} onClick={makePlan} className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-40">
                {plan.loading ? "기획안 만드는 중…" : "AI 기획안 만들기"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-yt-muted">위 통계와 떡상 영상만 근거로 넣고, 데이터에 없는 수치는 쓰지 않게 지시합니다. 내 Claude API 키로 1회 호출합니다(누를 때만 비용 발생).</p>
            {plan.error && <div className="mt-3"><ErrorBanner message={plan.error} needApiKey={plan.needApiKey} /></div>}
            {plan.report && <PlanView report={plan.report} onCopy={copy} />}
          </section>

          {/* 목록 */}
          <section className="rounded-2xl border border-yt-border bg-yt-surface p-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold text-yt-text">영상 {shown.length}개{kwFilter ? ` · "${kwFilter}" 포함` : ""}</p>
              <label className="inline-flex items-center gap-1.5 text-xs text-yt-muted"><input type="checkbox" checked={onlyOutliers} onChange={(e) => setOnlyOutliers(e.target.checked)} /> 떡상만</label>
              <select className={`${SELECT_CLASS} ml-auto`} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="정렬">
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label} 순</option>)}
              </select>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((v) => <VideoCard key={v.id} v={v} onCopyTags={() => copy(v.tags.join(", "))} />)}
            </div>
            {shown.length === 0 && <p className="py-10 text-center text-sm text-yt-muted">조건에 맞는 영상이 없습니다. 필터를 풀거나 조건을 바꿔 보세요.</p>}
          </section>

          {/* 제외 사유 */}
          {excludedTotal > 0 && (
            <section className="rounded-2xl border border-yt-border bg-yt-surface p-5 text-sm">
              <button type="button" onClick={() => setShowExcluded(!showExcluded)} className="font-bold text-yt-text">
                걸러 낸 영상 {excludedTotal}개 {showExcluded ? "▲" : "▼"} <span className="text-xs font-normal text-yt-muted">
                  ({(Object.keys(result.excluded) as ExcludeKey[]).filter((k) => result.excluded[k]).map((k) => `${EXCLUDE_LABELS[k]} ${result.excluded[k]}`).join(" · ")})
                </span>
              </button>
              {showExcluded && (
                <ul className="mt-2 space-y-1 text-xs text-yt-muted">
                  {result.excludedItems.slice(0, 60).map((x) => (
                    <li key={x.id}>[{EXCLUDE_LABELS[x.reason]}] <a className="text-yt-link" href={`https://www.youtube.com/watch?v=${x.id}`} target="_blank" rel="noopener noreferrer">{x.title}</a> · {x.channelTitle}</li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-yt-muted">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold text-yt-text">{value}</p>
    </div>
  );
}

function GroupChart({ groups }: { groups: { label: string; count: number; outlierRate: number; medianScore: number | null }[] }) {
  return (
    <>
      <BarChart
        formatValue={(n) => `${n.toFixed(1)}배`}
        items={groups.map((g) => ({ label: g.label, value: g.count >= 3 && g.medianScore ? g.medianScore : 0, title: `${g.label}: 영상 ${g.count}개 · 평소 대비 중앙값 ${g.medianScore ?? "-"}배 · 떡상 ${g.outlierRate}%` }))}
      />
      <p className="mt-2 text-[11px] text-yt-muted">막대 = 평소 대비 배수 중앙값(영상 3개 이상인 묶음만). 막대에 마우스를 올리면 영상 수·떡상 비율이 보입니다.</p>
    </>
  );
}

function VideoCard({ v, onCopyTags }: { v: FinderVideo; onCopyTags: () => void }) {
  const hot = v.qualifies && (v.score as number) >= 3;
  return (
    <article className={`overflow-hidden rounded-xl border bg-yt-raised ${hot ? "border-yt-red/60" : "border-yt-border"}`}>
      <a href={v.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-video bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube 썸네일 */}
        {v.thumbnail && <img src={v.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />}
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 text-[11px] text-white">{v.isShorts ? "쇼츠 " : ""}{v.durationFormatted}</span>
        {hot && <span className="absolute left-1 top-1 rounded bg-yt-red px-1.5 py-0.5 text-[11px] font-bold text-white">🔥 떡상</span>}
      </a>
      <div className="space-y-1.5 p-3">
        <a href={v.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-bold text-yt-text hover:underline">{v.title}</a>
        <p className="truncate text-xs text-yt-muted">{v.channelTitle} · 구독자 {v.subscriberCountFormatted} · {v.publishedAtRelative}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className={hot ? "font-extrabold text-yt-danger" : "font-bold text-yt-text"}>
            {v.scoreBasis === "baseline" ? `평소 대비 ${v.scoreFormatted}` : v.scoreBasis === "subs" ? `구독자 대비 ${v.scoreFormatted}(추정)` : "배수 계산 불가"}
          </span>
          <span className="text-yt-muted">조회 {v.viewCountFormatted}</span>
          <span className="text-yt-muted">하루 {v.viewsPerDayFormatted}</span>
          {v.likeRate !== null && <span className="text-yt-muted">좋아요 {v.likeRate}%</span>}
        </div>
        <p className="text-[11px] text-yt-muted">평소 조회수 {v.channelBaselineFormatted}{v.baselineSampleSize ? `(최근 ${v.baselineSampleSize}개 중앙값)` : ""} · 구독자 대비 {v.subsRatioFormatted}</p>
        <div className="flex gap-3 pt-1 text-[11px]">
          {v.tags.length > 0 && <button type="button" onClick={onCopyTags} className="inline-flex items-center gap-1 font-bold text-yt-link"><Copy className="h-3 w-3" /> 태그 {v.tags.length}개 복사</button>}
          <a href={`/channel-analysis?q=${encodeURIComponent(v.channelId)}`} className="inline-flex items-center gap-1 font-bold text-yt-link"><ExternalLink className="h-3 w-3" /> 채널 분석</a>
        </div>
      </div>
    </article>
  );
}

function PlanView({ report, onCopy }: { report: PlanReport; onCopy: (t: string) => void }) {
  const list = (title: string, items: string[]) => items.length > 0 && (
    <div>
      <p className="text-xs font-bold text-purple-300">{title}</p>
      <ul className="mt-1 space-y-1 text-sm text-yt-text">{items.map((x, i) => <li key={i}>• {x}</li>)}</ul>
    </div>
  );
  return (
    <div className="mt-4 space-y-4">
      <p className="rounded-xl bg-yt-surface p-3 text-sm font-bold text-yt-text">{report.summary}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {list("시청자를 끈 각도", report.hookingAngles)}
        {list("제목 공식", report.titleFormulas)}
        {list("썸네일·첫 화면 패턴", report.thumbnailPatterns)}
        {report.formatStrategy && list("쇼츠·롱폼 운영 전략", [report.formatStrategy])}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {report.recommendations.map((r, i) => (
          <article key={i} className="rounded-xl border border-yt-border bg-yt-surface p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-yt-text"><span className="mr-1 rounded bg-purple-500/30 px-1.5 text-[11px]">{r.format}</span>{r.title}</p>
              <button type="button" onClick={() => onCopy(`${r.title}\n\n${r.hookIntro}\n\n${r.outline.join("\n")}\n\n${r.tags.map((x) => `#${x}`).join(" ")}`)} className="shrink-0 text-yt-link" aria-label="기획안 복사"><Copy className="h-4 w-4" /></button>
            </div>
            {r.altTitles.length > 0 && <p className="mt-1 text-xs text-yt-muted">다른 제목: {r.altTitles.join(" / ")}</p>}
            <p className="mt-2 text-xs text-yt-muted">{r.targetLength} · {r.targetViewer}</p>
            <p className="mt-2"><b className="text-yt-gold">훅</b> {r.hookIntro}</p>
            <p className="mt-1"><b className="text-yt-gold">썸네일</b> {r.thumbnailConcept}</p>
            {r.outline.length > 0 && <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-yt-text">{r.outline.map((o, j) => <li key={j}>{o}</li>)}</ol>}
            {r.keyPoints.length > 0 && <p className="mt-2 text-xs text-yt-muted">유지 포인트: {r.keyPoints.join(" · ")}</p>}
            {r.tags.length > 0 && <p className="mt-2 text-xs text-yt-link">{r.tags.map((x) => `#${x}`).join(" ")}</p>}
            {r.reference && <p className="mt-2 text-[11px] text-yt-muted">근거: {r.reference}</p>}
          </article>
        ))}
      </div>
      {report.blueOceanInsight && <p className="rounded-xl border border-yt-success/40 bg-yt-success/10 p-3 text-sm text-yt-text">🌊 틈새 공략: {report.blueOceanInsight}</p>}
    </div>
  );
}
