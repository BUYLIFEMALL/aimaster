"use client";

import { useState } from "react";
import { VideoCard } from "@/components/common/VideoCard";
import type { YouTubeVideoItem } from "@/lib/youtube/types";
import { Flame, RefreshCw, AlertCircle, Key } from "lucide-react";
import Link from "next/link";
import { errorMessage } from "@/lib/errors";

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
    } catch (err: unknown) {
      setError(errorMessage(err) || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-yt-border bg-yt-surface p-3 text-sm text-yt-muted">조건을 정한 뒤 검색·조회 버튼을 눌러 실행해주세요. 회원님 본인의 YouTube API 할당량을 사용하며, 대본 분석은 별도로 AI 사용료가 발생할 수 있습니다.</p>
      {/* 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-yt-red/10 text-yt-danger rounded-lg">
              <Flame className="w-5 h-5 fill-red-600" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-yt-text">
              실시간 터진 영상 (VPH 랭킹)
            </h1>
          </div>
          <p className="text-sm text-yt-muted mt-1">
            현재 조회한 누적 조회수와 업로드 후 경과 시간으로 계산한 평균 VPH 랭킹입니다. 최근 1시간 증가량이나 추천 유입을 직접 측정한 값은 아닙니다.
          </p>
        </div>

        <button
          onClick={() => fetchTrending()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-yt-surface hover:bg-yt-hover text-yt-text border border-yt-border rounded-lg transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>영상 조회</span>
        </button>
      </div>

      {/* API 키 미등록 경고 배너 */}
      {needApiKey && (
        <div className="p-5 rounded-2xl bg-yt-warn/10 border border-yt-warn/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yt-warn/10 text-yt-warn rounded-xl shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-yt-warn">
                본인의 YouTube Data API v3 키를 먼저 등록해주세요
              </h3>
              <p className="text-xs text-yt-warn mt-0.5 leading-relaxed">
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
      <div className="flex items-center gap-2 p-1.5 bg-yt-raised rounded-xl w-fit">
        <button
          disabled={loading} onClick={() => { setActiveTab("shorts"); setVideos([]); setError(null); }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "shorts"
              ? "bg-yt-surface text-yt-danger shadow-xs"
              : "text-yt-muted hover:text-yt-text"
          }`}
        >
          ⚡ 실시간 쇼츠 급상승
        </button>
        <button
          disabled={loading} onClick={() => { setActiveTab("long"); setVideos([]); setError(null); }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "long"
              ? "bg-yt-surface text-yt-text shadow-xs"
              : "text-yt-muted hover:text-yt-text"
          }`}
        >
          📺 일반 롱폼 급상승
        </button>
        <button
          disabled={loading} onClick={() => { setActiveTab("all"); setVideos([]); setError(null); }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "all"
              ? "bg-yt-surface text-yt-text shadow-xs"
              : "text-yt-muted hover:text-yt-text"
          }`}
        >
          전체 급상승
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && !needApiKey && (
        <div className="p-4 rounded-xl bg-yt-red/10 border border-yt-red/40 text-yt-danger text-sm flex items-center gap-2">
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
              className="bg-yt-surface rounded-xl border border-yt-border overflow-hidden shadow-xs animate-pulse"
            >
              <div className="aspect-video bg-yt-raised" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-yt-raised rounded w-3/4" />
                <div className="h-3 bg-yt-raised rounded w-1/2" />
                <div className="h-10 bg-yt-raised rounded-lg" />
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
        <div className="bg-yt-surface rounded-2xl border border-dashed border-yt-border p-12 text-center">
          <p className="text-sm font-semibold text-yt-muted">
            조회된 실시간 급상승 영상이 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
