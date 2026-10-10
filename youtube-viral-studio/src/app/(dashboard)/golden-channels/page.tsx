"use client";

import { useState, useEffect } from "react";
import { ChannelCard } from "@/components/common/ChannelCard";
import type { YouTubeChannelItem, GoldenChannelsParams } from "@/lib/youtube/types";
import {
  Sparkles,
  Search,
  Filter,
  Users,
  AlertCircle,
  Key,
} from "lucide-react";
import Link from "next/link";

const CATEGORY_CHIPS = [
  "이슈 쇼츠",
  "심리학",
  "역사 미스터리",
  "재테크 주식",
  "다이어트 운동",
  "축구 스포츠",
  "생활 꿀팁",
  "AI 테크",
];

export default function GoldenChannelsPage() {
  const [keyword, setKeyword] = useState("이슈 쇼츠");
  const [maxSubscribers, setMaxSubscribers] = useState(10000); // 1만 이하 소형 채널
  const [minAverageViews, setMinAverageViews] = useState(30000); // 평균 3만회 이상
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<YouTubeChannelItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needApiKey, setNeedApiKey] = useState(false);

  const handleSearch = async (targetKeyword = keyword) => {
    setLoading(true);
    setError(null);
    setNeedApiKey(false);

    try {
      const res = await fetch("/api/youtube/golden-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: targetKeyword,
          maxSubscribers,
          minAverageViews,
          maxResults: 24,
        } as GoldenChannelsParams),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needApiKey) {
          setNeedApiKey(true);
        }
        setError(data.error || "황금 채널 발굴 중 오류가 발생했습니다.");
        setChannels([]);
        return;
      }

      setChannels(data.items || []);
    } catch (err: any) {
      setError(err.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch("이슈 쇼츠");
  }, []);

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
            <Sparkles className="w-5 h-5 fill-amber-500" />
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            황금 채널 발굴기
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          구독자 1만명 이하 소형 채널 중 영상당 평균 조회수가 수만~수십만 회에 달하는 알고리즘 최적화 벤치마킹 타깃을 찾아냅니다.
        </p>
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
                AIMaster의 최상위 불변 원칙에 따라 모든 회원은 본인의 Google Cloud 콘솔에서 무료 발급받은 API 키를 직접 연동하여 사용합니다.
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

      {/* 검색 & 조건 필터 바 */}
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
              placeholder="탐색할 카테고리나 키워드를 입력하세요 (예: 이슈, 심리학, 역사, 꿀팁)"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>발굴 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white" />
                <span>황금 채널 발굴</span>
              </>
            )}
          </button>
        </form>

        {/* 분야 칩 */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-400 font-semibold">인기 분야:</span>
          {CATEGORY_CHIPS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setKeyword(cat);
                handleSearch(cat);
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 필터 옵션 */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-gray-500 font-semibold mb-1.5">
              채널 최대 구독자 수 (소형 채널 한도)
            </label>
            <select
              value={maxSubscribers}
              onChange={(e) => setMaxSubscribers(parseInt(e.target.value, 10))}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            >
              <option value="5000">5천명 이하 (극초기 떡상 채널)</option>
              <option value="10000">1만명 이하 (추천 - 소형 채널)</option>
              <option value="30000">3만명 이하</option>
              <option value="50000">5만명 이하</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1.5">
              영상당 최소 평균 조회수
            </label>
            <select
              value={minAverageViews}
              onChange={(e) => setMinAverageViews(parseInt(e.target.value, 10))}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            >
              <option value="10000">1만회 이상</option>
              <option value="30000">3만회 이상 (추천)</option>
              <option value="50000">5만회 이상</option>
              <option value="100000">10만회 이상 (초고효율 채널)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
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
            발굴된 황금 채널
          </h2>
          {channels.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {channels.length}개 발견
            </span>
          )}
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-20 bg-gray-50 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* 결과 그리드 */}
      {!loading && channels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} />
          ))}
        </div>
      )}

      {/* 빈 결과 상태 */}
      {!loading && channels.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">
            조건에 부합하는 소형 황금 채널을 찾지 못했습니다
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            최대 구독자 수 한도를 높이거나 평균 조회수 기준을 완화하여 다시 검색해보세요.
          </p>
        </div>
      )}
    </div>
  );
}
