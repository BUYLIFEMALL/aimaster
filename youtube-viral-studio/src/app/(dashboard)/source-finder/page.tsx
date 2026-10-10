"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { SourceFinderResult } from "@/lib/youtube/sourceFinder";
import {
  Link2,
  Search,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Key,
  CheckCircle2,
  ArrowRight,
  Eye,
} from "lucide-react";
import { formatNumber, formatRelativeTime } from "@/lib/youtube/metrics";
import Link from "next/link";

export default function SourceFinderPage() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SourceFinderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needApiKey, setNeedApiKey] = useState(false);

  const handleSearch = async (targetUrl = url) => {
    if (!targetUrl.trim()) return;

    setLoading(true);
    setError(null);
    setNeedApiKey(false);

    try {
      const res = await fetch("/api/youtube/source-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needApiKey) {
          setNeedApiKey(true);
        }
        setError(data.error || "쇼츠 원본 역추적에 실패했습니다.");
        setResult(null);
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialUrl) {
      handleSearch(initialUrl);
    }
  }, [initialUrl]);

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
            <Link2 className="w-5 h-5" />
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            쇼츠 원본 찾기 (롱폼 역추적)
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          화제가 된 쇼츠의 URL을 입력하면 설명란 링크 분석 및 동일 채널의 롱폼 영상을 역추적하여 원본 풀영상을 찾아냅니다.
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

      {/* URL 입력 폼 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Link2 className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="쇼츠 링크를 입력하세요 (예: https://www.youtube.com/shorts/dQw4w9WgXcQ)"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>추적 중...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>원본 역추적</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 에러 메시지 */}
      {error && !needApiKey && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 분석 결과 */}
      {result && (
        <div className="space-y-6">
          {/* 1. 입력한 쇼츠 정보 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>🎯 분석 대상 쇼츠</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <img
                src={result.shortsVideo.thumbnailUrl}
                alt={result.shortsVideo.title}
                className="w-full sm:w-64 aspect-video rounded-xl object-cover border border-gray-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {result.shortsVideo.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="font-semibold text-gray-800">
                    {result.shortsVideo.channelTitle}
                  </span>
                  <span>•</span>
                  <span>조회수 {formatNumber(result.shortsVideo.viewCount)}회</span>
                  <span>•</span>
                  <span>{formatRelativeTime(result.shortsVideo.publishedAt)}</span>
                </div>
                {result.shortsVideo.description && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 line-clamp-3 leading-relaxed whitespace-pre-line">
                    {result.shortsVideo.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. 설명란에 직접 링크된 영상 (확정 원본) */}
          {result.directLinkedVideos.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs">
              <h2 className="text-sm font-bold text-emerald-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>설명란에 직접 명시된 풀영상 (확정 원본)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.directLinkedVideos.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex gap-4 items-center"
                  >
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title}
                      className="w-32 aspect-video rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 line-clamp-2 mb-1.5">
                        {v.title}
                      </h4>
                      <div className="text-[11px] text-gray-500 mb-2">
                        조회수 {formatNumber(v.viewCount)}회
                      </div>
                      <a
                        href={`https://www.youtube.com/watch?v=${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <span>풀영상 시청하기</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. AI / 키워드 유사도 기반 동일 채널 롱폼 원본 후보 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>동일 채널 롱폼 매칭 후보 (유사도 기반 추적)</span>
            </h2>

            {result.candidateVideos.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                동일 채널에서 연관된 롱폼 영상을 찾지 못했습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {result.candidateVideos.map(({ video, similarityScore, matchReason }) => (
                  <div
                    key={video.id}
                    className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 bg-white transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    <div className="flex gap-4 items-center flex-1 min-w-0">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-28 aspect-video rounded-lg object-cover border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              similarityScore >= 50
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            일치율 {similarityScore}%
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {matchReason}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 truncate" title={video.title}>
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>조회수 {formatNumber(video.viewCount)}회</span>
                          <span>•</span>
                          <span>{formatRelativeTime(video.publishedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center"
                    >
                      <span>롱폼 원본 보기</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
