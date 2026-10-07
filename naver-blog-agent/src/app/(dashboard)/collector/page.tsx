"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Search,
  Globe,
  Video,
  Trash2,
  CheckCircle2,
  Archive,
  RotateCcw,
  ExternalLink,
  PenLine,
  AlertCircle,
  Sparkles,
  Play,
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import type { BlogViralCandidate, ShortVideo, ShortsOrder } from "@/types/collector";
import { INITIAL_SAMPLE_CANDIDATES } from "@/types/collector";

const STATUS_MAP: Record<string, { label: string; tone: string }> = {
  ready: { label: "사용 가능", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  used: { label: "사용 완료", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  archived: { label: "보관", tone: "bg-neutral-100 text-neutral-600 border-neutral-200" },
};

const GRADE_TONE: Record<string, string> = {
  초대박: "bg-rose-600 text-white",
  대박: "bg-orange-500 text-white",
  떡상: "bg-amber-400 text-amber-950 font-bold",
  양호: "bg-emerald-100 text-emerald-800",
  보통: "bg-neutral-100 text-neutral-600",
  판정불가: "bg-neutral-100 text-neutral-400",
};

function formatNumber(num: number | null): string {
  if (num === null) return "비공개";
  if (num >= 100_000_000) return `${(num / 100_000_000).toFixed(1)}억`;
  if (num >= 10_000) return `${(num / 10_000).toFixed(1)}만`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}천`;
  return num.toLocaleString();
}

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export default function CollectorPage() {
  const router = useRouter();

  // 글감 목록 상태
  const [candidates, setCandidates] = useState<BlogViralCandidate[]>([]);
  const [mounted, setMounted] = useState(false);

  // 수집 탭 및 입력값
  const [activeTab, setActiveTab] = useState<"url" | "perplexity" | "shorts">("url");
  const [urlInput, setUrlInput] = useState("");
  const [topicInput, setTopicInput] = useState("");

  // 쇼츠 검색 필터 및 결과
  const [shortsQuery, setShortsQuery] = useState("");
  const [shortsDateFrom, setShortsDateFrom] = useState(() => isoDay(-30));
  const [shortsDateTo, setShortsDateTo] = useState(() => isoDay(0));
  const [shortsOrder, setShortsOrder] = useState<ShortsOrder>("viewCount");
  const [minViews, setMinViews] = useState("");
  const [maxSubs, setMaxSubs] = useState("");
  const [shortsList, setShortsList] = useState<ShortVideo[]>([]);
  const [searchingShorts, setSearchingShorts] = useState(false);
  const [analyzingShortId, setAnalyzingShortId] = useState<string | null>(null);

  // 공통 로딩 및 메시지
  const [collecting, setCollecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; needKey?: boolean } | null>(null);

  // 글감 필터 & 선택
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // 1. LocalStorage 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nba_viral_candidates");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCandidates(parsed);
          setMounted(true);
          return;
        }
      }
      // 초기 기본 글감 제공
      setCandidates(INITIAL_SAMPLE_CANDIDATES);
      localStorage.setItem("nba_viral_candidates", JSON.stringify(INITIAL_SAMPLE_CANDIDATES));
    } catch {
      setCandidates(INITIAL_SAMPLE_CANDIDATES);
    } finally {
      setMounted(true);
    }
  }, []);

  // 2. 글감 저장 헬퍼
  const persistCandidates = (updated: BlogViralCandidate[]) => {
    setCandidates(updated);
    try {
      localStorage.setItem("nba_viral_candidates", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save candidates to local storage:", e);
    }
  };

  // 통계 집계
  const countOf = (st: string) => candidates.filter((c) => c.status === st).length;
  const visibleCandidates = useMemo(() => {
    return candidates.filter((c) => statusFilter === "all" || c.status === statusFilter);
  }, [candidates, statusFilter]);

  // 보관 아닌 삭제 가능 글감
  const deletable = visibleCandidates.filter((c) => c.status !== "archived");
  const checkedDeletable = checkedIds.filter((id) => deletable.some((c) => c.id === id));
  const unarchivedCount = candidates.filter((c) => c.status !== "archived").length;

  // 체크박스 토글
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // URL 스크랩 수집 실행
  const handleCollectUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim() || collecting) return;
    setCollecting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "url", url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "수집 실패", needKey: data.needKey });
        return;
      }
      const newItems: BlogViralCandidate[] = data.candidates || [];
      const updated = [...newItems, ...candidates];
      persistCandidates(updated);
      setUrlInput("");
      setMessage({
        type: "success",
        text: `웹 페이지에서 블로그 글감 ${newItems.length}건을 성공적으로 발굴·생성했습니다.`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: "수집 요청 오류: " + err.message });
    } finally {
      setCollecting(false);
    }
  };

  // Perplexity 실시간 트렌드 수집 실행
  const handleCollectPerplexity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topicInput.trim() || collecting) return;
    setCollecting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "perplexity", topic: topicInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "수집 실패", needKey: data.needKey });
        return;
      }
      const newItems: BlogViralCandidate[] = data.candidates || [];
      const updated = [...newItems, ...candidates];
      persistCandidates(updated);
      setTopicInput("");
      setMessage({
        type: "success",
        text: `최근 72시간 화제 이슈에서 네이버 블로그 글감 ${newItems.length}건을 수집했습니다.`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: "화제 검색 오류: " + err.message });
    } finally {
      setCollecting(false);
    }
  };

  // 쇼츠 검색 실행
  const handleSearchShorts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!shortsQuery.trim() || searchingShorts) return;
    setSearchingShorts(true);
    setMessage(null);

    try {
      const res = await fetch("/api/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shorts_search",
          query: shortsQuery.trim(),
          dateFrom: shortsDateFrom,
          dateTo: shortsDateTo,
          order: shortsOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "쇼츠 검색 실패", needKey: data.needKey });
        return;
      }
      setShortsList(data.videos || []);
    } catch (err: any) {
      setMessage({ type: "error", text: "쇼츠 검색 중 오류 발생: " + err.message });
    } finally {
      setSearchingShorts(false);
    }
  };

  // 필터링된 쇼츠 목록
  const filteredShorts = useMemo(() => {
    const minV = minViews ? Number(minViews) : null;
    const maxS = maxSubs ? Number(maxSubs) : null;
    return shortsList.filter((v) => {
      if (minV !== null && v.views < minV) return false;
      if (maxS !== null && (v.subs === null || v.subs > maxS)) return false;
      return true;
    });
  }, [shortsList, minViews, maxSubs]);

  // 쇼츠 1건 분석 후 글감으로 추출
  const handleAnalyzeShort = async (video: ShortVideo) => {
    setAnalyzingShortId(video.id);
    setMessage(null);

    try {
      const res = await fetch("/api/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "shorts_analyze", video }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "분석 실패", needKey: data.needKey });
        return;
      }
      const newItems: BlogViralCandidate[] = data.candidates || [];
      const updated = [...newItems, ...candidates];
      persistCandidates(updated);
      setMessage({
        type: "success",
        text: `"${video.title.slice(0, 30)}..." 쇼츠에서 떡상 블로그 글감 ${newItems.length}건을 생성했습니다!`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: "영상 분석 오류: " + err.message });
    } finally {
      setAnalyzingShortId(null);
    }
  };

  // 개별 상태 변경
  const updateStatus = (id: string, newStatus: "ready" | "used" | "archived") => {
    const updated = candidates.map((c) => (c.id === id ? { ...c, status: newStatus } : c));
    persistCandidates(updated);
  };

  // 단일 삭제
  const deleteCandidate = (item: BlogViralCandidate) => {
    if (!window.confirm(`"${item.title.slice(0, 30)}" 글감을 삭제하시겠습니까?`)) return;
    const updated = candidates.filter((c) => c.id !== item.id);
    persistCandidates(updated);
    setCheckedIds((prev) => prev.filter((i) => i !== item.id));
  };

  // 일괄 삭제
  const bulkDelete = (mode: "selected" | "all_unarchived") => {
    if (mode === "selected") {
      if (!checkedDeletable.length) return;
      if (!window.confirm(`선택한 글감 ${checkedDeletable.length}건을 삭제하시겠습니까? (보관 상태는 유지)`)) return;
      const updated = candidates.filter((c) => !checkedDeletable.includes(c.id));
      persistCandidates(updated);
      setCheckedIds([]);
      setMessage({ type: "success", text: `선택한 글감 ${checkedDeletable.length}건을 삭제했습니다.` });
    } else {
      if (!unarchivedCount) return;
      if (!window.confirm(`보관된 글감을 제외한 전체 ${unarchivedCount}건의 글감을 모두 삭제하시겠습니까?`)) return;
      const updated = candidates.filter((c) => c.status === "archived");
      persistCandidates(updated);
      setCheckedIds([]);
      setMessage({ type: "success", text: `보관 제외 글감 ${unarchivedCount}건을 일괄 정리했습니다.` });
    }
  };

  // 이 글감으로 자동 생성기 이동
  const handleUseCandidate = (item: BlogViralCandidate) => {
    router.push(`/?viralId=${item.id}&topic=${encodeURIComponent(item.title)}&category=${encodeURIComponent(item.category)}`);
  };

  if (!mounted) {
    return <div className="p-8 text-neutral-500 text-sm">글감 수집소를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. 상단 브리핑 헤더 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white font-bold text-sm shadow-sm">
                🔥
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Viral Content Collector
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black text-neutral-900 tracking-tight">
              떡상 글감 수집소
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 max-w-3xl">
              실제 검색량과 대중 반응이 터진 소재를 발굴하여, 네이버 C-Rank / D-I-A+ 검색 상위 노출에 최적화된
              블로그 글감으로 자동 변환합니다. 웹 뉴스 스크랩, Perplexity 72시간 핫이슈, 유튜브 쇼츠 대박 분석을
              통해 매력적인 소재를 선점하세요.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 transition-all"
          >
            <PenLine size={16} />
            글 자동 생성기로 이동
          </Link>
        </div>
      </section>

      {/* 2. 통계 지표 카드 */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-neutral-500">전체 수집 글감</span>
          <p className="mt-1.5 text-2xl font-black text-neutral-900">{candidates.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700">사용 가능</span>
          <p className="mt-1.5 text-2xl font-black text-emerald-700">{countOf("ready")}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm">
          <span className="text-xs font-semibold text-sky-700">발행 완료</span>
          <p className="mt-1.5 text-2xl font-black text-sky-700">{countOf("used")}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
          <span className="text-xs font-semibold text-neutral-600">영구 보관</span>
          <p className="mt-1.5 text-2xl font-black text-neutral-700">{countOf("archived")}</p>
        </div>
      </section>

      {/* 메시지 알림 바 */}
      {message && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-medium">{message.text}</p>
            {message.needKey && (
              <p className="mt-1.5 text-xs text-rose-700">
                키 등록이 필요하신가요?{" "}
                <Link href="/settings" className="font-bold underline hover:text-rose-950">
                  [API키등록·플랫폼연동] 메뉴로 이동하기 →
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. 수집 컨트롤러 박스 (3대 수집 방식 탭) */}
      <section className="rounded-2xl border-2 border-neutral-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Search size={18} className="text-emerald-600" />
          <h2 className="text-base font-bold text-neutral-900">글감 수집 방식 선택</h2>
        </div>

        {/* 탭 버튼들 */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "url"
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Globe size={15} />
            ① 웹 페이지 / 뉴스 URL 지정
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("perplexity")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "perplexity"
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Sparkles size={15} />
            ② 화제 검색 (Perplexity 72h)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shorts")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "shorts"
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Video size={15} />
            ③ 유튜브 쇼츠 떡상 분석
          </button>
        </div>

        {/* 탭 1: URL 수집 */}
        {activeTab === "url" && (
          <form onSubmit={handleCollectUrl} className="mt-4 space-y-3">
            <p className="text-xs text-neutral-600 leading-relaxed">
              기사 1건의 주소를 넣으면 해당 기사를, 목록 페이지(예: 네이버 뉴스 섹션, IT 포털)를 넣으면 상위 기사 중
              무작위로 선별하여 네이버 블로그에 최적화된 글감 후보로 재가공합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://news.naver.com/section/105 또는 기사 전체 URL"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={collecting || !urlInput.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Flame size={16} />
                {collecting ? "분석 및 글감 생성 중..." : "글감 수집"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              ※ SSRF 안전 필터링이 적용되어 공개 웹 페이지만 수집 가능하며, 본인 등록 OpenAI / Gemini / Claude 키가 활용됩니다.
            </p>
          </form>
        )}

        {/* 탭 2: Perplexity 화제 검색 */}
        {activeTab === "perplexity" && (
          <form onSubmit={handleCollectPerplexity} className="mt-4 space-y-3">
            <p className="text-xs text-neutral-600 leading-relaxed">
              시드 키워드나 관심 주제를 입력하면, Perplexity AI가 최근 72시간 이내 한국어권에서 대중의 클릭이 폭발한
              핵심 이슈를 심층 조사하여 네이버 블로그 맞춤형 글감으로 구조화합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="예: 2026 청년 복지 지원금 혜택, 다이소 살림 꿀템, 신형 로봇청소기 비교"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={collecting || !topicInput.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Sparkles size={16} />
                {collecting ? "실시간 검색 중..." : "72시간 화제 수집"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              ※ 본인이 [API키등록·플랫폼연동] 메뉴에 등록한 Perplexity API 키(pplx-...)가 사용됩니다.
            </p>
          </form>
        )}

        {/* 탭 3: 유튜브 쇼츠 떡상 분석 */}
        {activeTab === "shorts" && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              조회수 대비 채널 구독자 수가 적은데도 폭발적으로 터진(Outlier) 유튜브 쇼츠를 검색하고,
              AI가 시청자를 사로잡은 훅(Hook)과 전개 방식을 분석하여 블로그 글감으로 바로 저장합니다.
            </p>

            {/* 빠른 프리셋 */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-neutral-500 mr-1">빠른 프리셋:</span>
              <button
                type="button"
                onClick={() => {
                  setShortsDateFrom(isoDay(-7));
                  setMinViews("50000");
                  setMaxSubs("");
                }}
                className="rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 hover:bg-neutral-200"
              >
                🔥 최근 7일 대박 쇼츠
              </button>
              <button
                type="button"
                onClick={() => {
                  setShortsDateFrom(isoDay(-30));
                  setMinViews("10000");
                  setMaxSubs("50000");
                }}
                className="rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 hover:bg-neutral-200"
              >
                🌱 소형 채널(구독자 5만 이하) 떡상
              </button>
              <button
                type="button"
                onClick={() => {
                  setShortsDateFrom(isoDay(-1));
                  setMinViews("5000");
                  setMaxSubs("");
                }}
                className="rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 hover:bg-neutral-200"
              >
                ⚡ 24시간 실시간 급상승
              </button>
            </div>

            {/* 검색 폼 */}
            <form onSubmit={handleSearchShorts} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={shortsQuery}
                onChange={(e) => setShortsQuery(e.target.value)}
                placeholder="검색어 (예: 살림 꿀팁, 청소 노하우, 재테크)"
                className="sm:col-span-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
              />
              <select
                value={shortsOrder}
                onChange={(e) => setShortsOrder(e.target.value as ShortsOrder)}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-800"
              >
                <option value="viewCount">조회수 높은 순</option>
                <option value="relevance">정확도 관련도 순</option>
                <option value="date">최신 등록 순</option>
              </select>
              <button
                type="submit"
                disabled={searchingShorts || !shortsQuery.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Search size={15} />
                {searchingShorts ? "검색 중..." : "쇼츠 검색"}
              </button>
            </form>

            {/* 검색 결과 표시 */}
            {shortsList.length > 0 && (
              <div className="mt-4 border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-800">
                    쇼츠 검색 결과 <span className="text-emerald-600 font-semibold">({filteredShorts.length}건)</span>
                  </h3>
                  <span className="text-xs text-neutral-400">떡상 점수 및 배지 기준 정렬</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredShorts.map((video) => {
                    const isAnalyzing = analyzingShortId === video.id;
                    return (
                      <div
                        key={video.id}
                        className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 hover:bg-white hover:shadow-sm transition-all"
                      >
                        {/* 썸네일 */}
                        <div className="relative w-24 h-32 shrink-0 rounded-lg overflow-hidden bg-neutral-200">
                          {video.thumbnail && (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span
                            className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              GRADE_TONE[video.grade] || "bg-neutral-800 text-white"
                            }`}
                          >
                            {video.grade}
                          </span>
                        </div>

                        {/* 영상 정보 */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight">
                              {video.title}
                            </p>
                            <p className="mt-1 text-[11px] text-neutral-500 truncate">
                              {video.channelName} • {video.publishedAt.slice(0, 10)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                              <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-medium text-neutral-700">
                                👁️ {formatNumber(video.views)}
                              </span>
                              <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-medium text-neutral-700">
                                👥 {formatNumber(video.subs)}
                              </span>
                              {video.vsRatio && (
                                <span className="rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 font-bold">
                                  {video.vsRatio.toFixed(1)}배 터짐
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center gap-2">
                            <a
                              href={`https://www.youtube.com/shorts/${video.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-0.5"
                            >
                              <Play size={10} />
                              보기
                            </a>
                            <button
                              type="button"
                              onClick={() => handleAnalyzeShort(video)}
                              disabled={isAnalyzing}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <Sparkles size={12} />
                              {isAnalyzing ? "분석 중..." : "글감 추출"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. 수집한 글감 목록 섹션 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">
              수집된 글감 보관함
            </h2>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-700">
              {visibleCandidates.length}건
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800"
            >
              <option value="all">전체 상태 보기</option>
              <option value="ready">사용 가능만</option>
              <option value="used">사용 완료만</option>
              <option value="archived">영구 보관만</option>
            </select>
          </div>
        </div>

        {/* 일괄 제어 바 */}
        {candidates.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700 border border-neutral-200">
            <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-neutral-900 rounded"
                checked={deletable.length > 0 && checkedDeletable.length === deletable.length}
                disabled={busy || !deletable.length}
                onChange={(e) =>
                  setCheckedIds(e.target.checked ? deletable.map((c) => c.id) : [])
                }
              />
              목록 전체 선택
            </label>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-600 font-medium">선택 {checkedDeletable.length}건</span>
            <button
              type="button"
              disabled={!checkedDeletable.length || busy}
              onClick={() => bulkDelete("selected")}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} />
              선택 삭제
            </button>
            <button
              type="button"
              disabled={!unarchivedCount || busy}
              onClick={() => bulkDelete("all_unarchived")}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} />
              보관 제외 전체 정리 ({unarchivedCount}건)
            </button>
            <span className="text-[11px] text-neutral-400 ml-auto">
              ※ [보관] 상태의 글감은 일괄 삭제 시에도 영구 보존됩니다.
            </span>
          </div>
        )}

        {/* 글감 리스트 */}
        {visibleCandidates.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
            조건에 맞는 글감이 없습니다. 상단에서 URL이나 검색어로 새 글감을 수집해 보세요.
          </div>
        ) : (
          <div className="mt-4 space-y-3.5">
            {visibleCandidates.map((item) => {
              const statusCfg = STATUS_MAP[item.status] || STATUS_MAP.ready;
              const isLocked = item.status === "archived";

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    item.status === "ready"
                      ? "border-neutral-200 bg-white shadow-sm hover:border-neutral-400"
                      : "border-neutral-200 bg-neutral-50/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-neutral-900 rounded"
                          checked={!isLocked && checkedIds.includes(item.id)}
                          disabled={busy || isLocked}
                          onChange={() => toggleCheck(item.id)}
                        />
                      </label>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-700">
                        {item.method === "perplexity"
                          ? "⚡ Perplexity 핫이슈"
                          : item.method === "shorts"
                          ? "🎬 유튜브 쇼츠"
                          : "🌐 웹 기사"}
                      </span>
                      <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                        {item.category}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusCfg.tone}`}
                      >
                        {statusCfg.label}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(item.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteCandidate(item)}
                      className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                      title="글감 삭제"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* 제목 */}
                  <h3 className="mt-2.5 text-base font-bold text-neutral-900 leading-snug">
                    {item.title}
                  </h3>

                  {/* 공략 앵글 */}
                  {item.angle && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50/70 px-2.5 py-1 rounded-lg border border-amber-200/50">
                      <TrendingUp size={13} className="text-amber-700 shrink-0" />
                      <span className="font-semibold">공략 앵글:</span>
                      <span className="text-amber-800">{item.angle}</span>
                    </div>
                  )}

                  {/* 요약 본문 */}
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                    {item.content}
                  </p>

                  {/* 키워드 태그 */}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 출처 */}
                  <div className="mt-2.5 flex items-center gap-1 text-xs text-neutral-400 truncate">
                    <span>출처:</span>
                    {item.source_input.startsWith("http") ? (
                      <a
                        href={item.source_input}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline inline-flex items-center gap-0.5 truncate"
                      >
                        <span className="truncate">{item.source_input}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="truncate">{item.source_input}</span>
                    )}
                  </div>

                  {/* 하단 액션 버튼 그룹 */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.status !== "ready" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(item.id, "ready")}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <RotateCcw size={13} />
                          사용 가능으로
                        </button>
                      )}
                      {item.status !== "used" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(item.id, "used")}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <CheckCircle2 size={13} />
                          사용 완료 표시
                        </button>
                      )}
                      {item.status !== "archived" ? (
                        <button
                          type="button"
                          onClick={() => updateStatus(item.id, "archived")}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <Archive size={13} />
                          보관
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateStatus(item.id, "ready")}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <RotateCcw size={13} />
                          보관 해제
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUseCandidate(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition-all"
                    >
                      <PenLine size={14} />
                      ✍️ 이 글감으로 블로그 글 생성
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
