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
      {/* 안내 알림 */}
      <div className="rounded-xl border border-amber-500/20 bg-[#131B2A] p-3 text-xs text-slate-300 shadow-sm">
        조건을 정한 뒤 <b className="font-bold text-[#FBBF24]">실시간 VPH 스캔</b> 버튼을 눌러 실행해 주세요. 회원님 본인의 YouTube API 할당량을 사용하며, 대본 분석은 별도로 AI 사용료가 발생할 수 있습니다.
      </div>

      {/* 상단 헤더 & 컨트롤 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-amber-500/30 bg-[#131B2A] p-6 shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B0F17] border border-amber-500/30 text-[#FBBF24]">
              <Flame className="h-5 w-5 fill-amber-400 text-amber-400" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-slate-100 md:text-2xl">
              실시간 급상승 VPH 매트릭스 피드
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            누적 조회수와 업로드 경과 시간으로 산출한 시간당 평균 VPH 순위입니다. 최근 1시간 증가량이나 추천 유입을 직관적으로 비교합니다.
          </p>
        </div>

        <button
          onClick={() => fetchTrending()}
          disabled={loading}
          className="btn-3d-gold shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>실시간 VPH 스캔</span>
        </button>
      </div>

      {/* API 키 미등록 경고 배너 */}
      {needApiKey && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-[#FBBF24] border border-amber-500/30">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#FBBF24]">
                본인의 YouTube Data API v3 키를 먼저 등록해 주세요
              </h3>
              <p className="mt-0.5 text-xs text-amber-200/80 leading-relaxed">
                AIMaster의 최상위 불문 원칙에 따라 모든 회원은 본인의 Google Cloud 콘솔에서 무료 발급받은 API 키를 직접 연동하여 사용합니다.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="btn-create-key shrink-0"
          >
            <span>보안 키 금고에서 등록 →</span>
          </Link>
        </div>
      )}

      {/* 2번안 골든 엠파이어 탭 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/25 bg-[#131B2A] p-2 shadow-sm">
        <button
          disabled={loading}
          onClick={() => { setActiveTab("shorts"); setVideos([]); setError(null); }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "shorts"
              ? "bg-[#FBBF24] text-[#0F172A] font-black shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:bg-[#0B0F17] hover:text-[#FBBF24]"
          }`}
        >
          <span>⚡</span>
          <span>실시간 쇼츠 9:16</span>
        </button>
        <button
          disabled={loading}
          onClick={() => { setActiveTab("long"); setVideos([]); setError(null); }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "long"
              ? "bg-[#FBBF24] text-[#0F172A] font-black shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:bg-[#0B0F17] hover:text-[#FBBF24]"
          }`}
        >
          <span>📺</span>
          <span>일반 롱폼 16:9</span>
        </button>
        <button
          disabled={loading}
          onClick={() => { setActiveTab("all"); setVideos([]); setError(null); }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "all"
              ? "bg-[#FBBF24] text-[#0F172A] font-black shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:bg-[#0B0F17] hover:text-[#FBBF24]"
          }`}
        >
          <span>👑</span>
          <span>전체 통합 랭킹</span>
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && !needApiKey && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs animate-pulse"
            >
              <div className="aspect-video bg-slate-200" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-200" />
                <div className="h-10 rounded-xl bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2번안 비주얼 썸네일 카드 3열 피드 그리드 */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* 빈 결과 */}
      {!loading && videos.length === 0 && !error && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-500">
            위의 <b>실시간 영상 조회</b> 버튼을 누르면 핫 트렌드 피드가 나타납니다.
          </p>
        </div>
      )}
    </div>
  );
}
