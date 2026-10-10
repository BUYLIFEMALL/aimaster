"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { VideoCard } from "@/components/common/VideoCard";
import type { ShortsSearchParams, YouTubeVideoItem } from "@/lib/youtube/types";
import {
  Search,
  Filter,
  Flame,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Key,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

const POPULAR_KEYWORDS = [
  "주식",
  "다이어트",
  "축구",
  "연애",
  "AI 활용법",
  "이슈",
  "쇼츠 꿀팁",
  "부동산",
  "미스터리",
  "심리학",
];

export default function ViralShortsPage() {
  const searchParams = useSearchParams();
  const initialKeyword = searchParams.get("keyword") || "";

  const [keyword, setKeyword] = useState(initialKeyword || "이슈 쇼츠");
  const [uploadPeriod, setUploadPeriod] = useState<"7d" | "30d" | "90d" | "365d" | "all">("30d");
  const [maxSubscribers, setMaxSubscribers] = useState<number | undefined>(50000); // 기본 5만 이하 채널 필터
  const [minViews, setMinViews] = useState<number>(30000); // 기본 3만회 이상
  const [sortBy, setSortBy] = useState<"viralScore" | "vsRatio" | "vph" | "viewCount" | "date">("viralScore");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<YouTubeVideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needApiKey, setNeedApiKey] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const handleSearch = async (targetKeyword = keyword) => {
    if (!targetKeyword.trim()) return;

    setLoading(true);
    setError(null);
    setNeedApiKey(false);

    try {
      const res = await fetch("/api/youtube/search-shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: targetKeyword,
          uploadPeriod,
          maxSubscribers: maxSubscribers || undefined,
          minViews,
          sortBy,
          maxResults: 30,
        } as ShortsSearchParams),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needApiKey) {
          setNeedApiKey(true);
        }
        setError(data.error || "검색 중 오류가 발생했습니다.");
        setItems([]);
        return;
      }

      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialKeyword) {
      handleSearch(initialKeyword);
    } else {
      handleSearch("이슈 쇼츠");
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-100 text-red-600 rounded-lg">
              <Search className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              조회수 폭발 쇼츠 찾기
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            소형 채널(구독자 1만~5만 이하)에서 알고리즘을 타고 수십만 회 터진 떡상 쇼츠를 초고속 발굴합니다.
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
            showFilters
              ? "bg-gray-100 text-gray-800 border-gray-300"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>상세 필터 {showFilters ? "접기" : "열기"}</span>
        </button>
      </div>

      {/* API 키 미등록 경고 배너 */}
      {needApiKey && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                본인의 YouTube Data API v3 키를 먼저 등록해주세요
              </h3>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                AIMaster의 최상위 불변 원칙에 따라 모든 회원은 본인의 Google Cloud 콘솔에서 무료 발급받은 API 키를 직접 연동하여 사용합니다. (1분 완료, 무료)
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shrink-0 shadow-xs"
          >
            <span>API 키 등록하러 가기</span>
            <span>&rarr;</span>
          </Link>
        </div>
      )}

      {/* 검색 & 추천 키워드 영역 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색할 주제나 키워드를 입력하세요 (예: 주식, 다이어트, 연애, 꿀팁, AI)"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-red-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>탐색 중...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 fill-white" />
                <span>떡상 쇼츠 발굴</span>
              </>
            )}
          </button>
        </form>

        {/* 추천 키워드 칩 */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>추천 키워드:</span>
          </span>
          {POPULAR_KEYWORDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKeyword(k);
                handleSearch(k);
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              #{k}
            </button>
          ))}
        </div>

        {/* 상세 다차원 필터 바 */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 업로드 기간 */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1.5">
                업로드 기간
              </label>
              <select
                value={uploadPeriod}
                onChange={(e) => setUploadPeriod(e.target.value as any)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
              >
                <option value="7d">최근 7일 이내 (초급상승)</option>
                <option value="30d">최근 30일 이내 (추천)</option>
                <option value="90d">최근 90일 이내</option>
                <option value="365d">최근 1년 이내</option>
                <option value="all">전체 기간</option>
              </select>
            </div>

            {/* 채널 최대 구독자수 (소형 채널 발굴) */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1.5">
                채널 최대 구독자수 (소형 채널 발굴)
              </label>
              <select
                value={maxSubscribers ?? "all"}
                onChange={(e) =>
                  setMaxSubscribers(
                    e.target.value === "all" ? undefined : parseInt(e.target.value, 10)
                  )
                }
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
              >
                <option value="10000">1만명 이하 (초소형 떡상)</option>
                <option value="50000">5만명 이하 (추천)</option>
                <option value="100000">10만명 이하</option>
                <option value="all">전체 채널 (제한없음)</option>
              </select>
            </div>

            {/* 최소 조회수 */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1.5">
                최소 조회수
              </label>
              <select
                value={minViews}
                onChange={(e) => setMinViews(parseInt(e.target.value, 10))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
              >
                <option value="10000">1만회 이상</option>
                <option value="30000">3만회 이상 (추천)</option>
                <option value="50000">5만회 이상</option>
                <option value="100000">10만회 이상</option>
                <option value="500000">50만회 이상</option>
              </select>
            </div>

            {/* 정렬 기준 */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1.5">
                정렬 기준
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
              >
                <option value="viralScore">🚀 떡상 점수순 (기여도 최고)</option>
                <option value="vsRatio">📈 구독대비 배수순 (소형 대박)</option>
                <option value="vph">🔥 시간당 속도(VPH)순</option>
                <option value="viewCount">👀 총 조회수 높은순</option>
                <option value="date">⏰ 최신 업로드순</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 에러 메시지 (API 키 외 기타 오류) */}
      {error && !needApiKey && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 결과 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">
            발굴된 떡상 쇼츠
          </h2>
          {items.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {items.length}개 발견
            </span>
          )}
        </div>

        {items.length > 0 && (
          <div className="text-xs text-gray-500">
            정렬: <span className="font-semibold text-gray-800">
              {sortBy === "viralScore" ? "떡상 점수순" : sortBy === "vsRatio" ? "구독대비 배수순" : sortBy === "vph" ? "시간당 속도(VPH)순" : "최신순"}
            </span>
          </div>
        )}
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs animate-pulse"
            >
              <div className="aspect-video bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-10 bg-gray-50 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 결과 그리드 */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* 빈 결과 상태 */}
      {!loading && items.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">
            해당 조건에 맞는 떡상 쇼츠가 없습니다
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            구독자 수 제한을 늘리거나 최소 조회수 기준을 낮춰서 다시 검색해보세요.
          </p>
          <button
            onClick={() => {
              setMaxSubscribers(undefined);
              setMinViews(10000);
              handleSearch();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>필터 완화하고 다시 검색</span>
          </button>
        </div>
      )}
    </div>
  );
}
