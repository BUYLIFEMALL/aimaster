"use client";

import { useState, useEffect } from "react";
import { VideoCard } from "@/components/common/VideoCard";
import type { YouTubeVideoItem } from "@/lib/youtube/types";
import { Flame, RefreshCw, AlertCircle, Key } from "lucide-react";
import Link from "next/link";

export default function TrendingVideosPage() {
  const [activeTab, setActiveTab] = useState<"shorts" | "long" | "all">("shorts");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needApiKey, setNeedApiKey] = useState(false);

  const fetchTrending = async (tab = activeTab) => {
    setLoading(true);
    setError(null);
    setNeedApiKey(false);

    try {
      const res = await fetch("/api/youtube/trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab,
          regionCode: "KR",
          maxResults: 30,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needApiKey) {
          setNeedApiKey(true);
        }
        setError(data.error || "실시간 터진 영상 조회에 실패했습니다.");
        setVideos([]);
        return;
      }

      setVideos(data.items || []);
    } catch (err: any) {
      setError(err.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending(activeTab);
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-100 text-red-600 rounded-lg">
              <Flame className="w-5 h-5 fill-red-600" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              실시간 터진 영상 (VPH 랭킹)
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            지금 이 순간 유튜브 알고리즘을 타고 시간당 조회수(VPH)가 폭발적으로 치솟는 실시간 급상승 영상 랭킹입니다.
          </p>
        </div>

        <button
          onClick={() => fetchTrending()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>새로고침</span>
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

      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("shorts")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "shorts"
              ? "bg-white text-red-600 shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ⚡ 실시간 쇼츠 급상승
        </button>
        <button
          onClick={() => setActiveTab("long")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "long"
              ? "bg-white text-gray-900 shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          📺 일반 롱폼 급상승
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "all"
              ? "bg-white text-gray-900 shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          전체 급상승
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && !needApiKey && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* 빈 결과 */}
      {!loading && videos.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm font-semibold text-gray-600">
            조회된 실시간 급상승 영상이 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
