"use client";

import { useState, useEffect } from "react";
import { Bookmark, Video, Users, Trash2, ExternalLink, Download } from "lucide-react";
import type { YouTubeVideoItem, YouTubeChannelItem } from "@/lib/youtube/types";
import { VideoCard } from "@/components/common/VideoCard";
import { ChannelCard } from "@/components/common/ChannelCard";

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<"videos" | "channels">("videos");
  const [savedVideos, setSavedVideos] = useState<YouTubeVideoItem[]>([]);
  const [savedChannels, setSavedChannels] = useState<YouTubeChannelItem[]>([]);

  useEffect(() => {
    // 로컬 스토리지에서 북마크 불러오기
    try {
      const v = localStorage.getItem("yvs_fav_videos");
      if (v) setSavedVideos(JSON.parse(v));
      const c = localStorage.getItem("yvs_fav_channels");
      if (c) setSavedChannels(JSON.parse(c));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleClear = (type: "videos" | "channels") => {
    if (!confirm("해당 보관함의 모든 항목을 삭제하시겠습니까?")) return;
    if (type === "videos") {
      setSavedVideos([]);
      localStorage.removeItem("yvs_fav_videos");
    } else {
      setSavedChannels([]);
      localStorage.removeItem("yvs_fav_channels");
    }
  };

  const handleExportCSV = () => {
    if (activeTab === "videos") {
      if (savedVideos.length === 0) return alert("내보낼 영상이 없습니다.");
      const headers = "ID,제목,채널명,조회수,VPH,구독대비배수,URL\n";
      const rows = savedVideos
        .map(
          (v) =>
            `"${v.id}","${v.title.replace(/"/g, '""')}","${v.channelTitle}",${v.viewCount},${v.vph},${v.vsRatio},"https://www.youtube.com/watch?v=${v.id}"`
        )
        .join("\n");
      const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `youtube-viral-videos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } else {
      if (savedChannels.length === 0) return alert("내보낼 채널이 없습니다.");
      const headers = "ID,채널명,구독자수,평균조회수,동영상수,URL\n";
      const rows = savedChannels
        .map(
          (c) =>
            `"${c.id}","${c.title.replace(/"/g, '""')}",${c.subscriberCount},${c.averageViews},${c.videoCount},"https://www.youtube.com/channel/${c.id}"`
        )
        .join("\n");
      const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `youtube-golden-channels-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Bookmark className="w-5 h-5 fill-amber-500" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              즐겨찾기 보관함
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            발굴한 떡상 쇼츠 영상과 황금 채널을 저장하고 CSV로 다운로드하여 벤치마킹 데이터베이스를 구축합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV 다운로드</span>
          </button>
          <button
            onClick={() => handleClear(activeTab)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>비우기</span>
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "videos"
              ? "bg-white text-gray-900 shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          영상 보관함 ({savedVideos.length})
        </button>
        <button
          onClick={() => setActiveTab("channels")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "channels"
              ? "bg-white text-gray-900 shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          채널 보관함 ({savedChannels.length})
        </button>
      </div>

      {/* 영상 목록 */}
      {activeTab === "videos" && (
        <>
          {savedVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedVideos.map((v) => (
                <VideoCard key={v.id} video={v} isBookmarked={true} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <Bookmark className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600 mb-1">
                보관된 영상이 없습니다
              </p>
              <p className="text-xs text-gray-400">
                [조회수 폭발 쇼츠 찾기] 또는 [실시간 터진 영상]에서 북마크 아이콘을 눌러 저장해보세요.
              </p>
            </div>
          )}
        </>
      )}

      {/* 채널 목록 */}
      {activeTab === "channels" && (
        <>
          {savedChannels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedChannels.map((c) => (
                <ChannelCard key={c.id} channel={c} isBookmarked={true} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600 mb-1">
                보관된 채널이 없습니다
              </p>
              <p className="text-xs text-gray-400">
                [황금 채널 발굴기]에서 마음에 드는 유망 채널을 저장해보세요.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
