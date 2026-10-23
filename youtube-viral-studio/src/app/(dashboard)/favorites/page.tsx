"use client";

import { useState } from "react";
import { Bookmark, Users, Download } from "lucide-react";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { FAVORITES_LOAD_LIMIT } from "@/lib/favorites";
import { FAVORITE_TTL_MS, csvCell } from "@/lib/favorites";
import type { YouTubeVideoItem, YouTubeChannelItem } from "@/lib/youtube/types";
import { VideoCard } from "@/components/common/VideoCard";
import { ChannelCard } from "@/components/common/ChannelCard";

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<"videos" | "channels">("videos");
  const store = useFavorites();
  const rows = store?.records ?? [];
  const savedVideos = rows.filter(r=>r.item_type==='video').map(r=>r.payload as YouTubeVideoItem);
  const savedChannels = rows.filter(r=>r.item_type==='channel').map(r=>r.payload as YouTubeChannelItem);
  const handleExportCSV = () => {
    if (activeTab === "videos") {
      if (savedVideos.length === 0) return alert("내보낼 영상이 없습니다.");
      const headers = "ID,제목,채널명,조회수,VPH,구독대비배수,URL\n";
      const rows = savedVideos
        .map(
          (v) =>
            [v.id,v.title,v.channelTitle,v.viewCount,v.vph,v.vsRatio,`https://www.youtube.com/watch?v=${v.id}`].map(csvCell).join(",")
        )
        .join("\n");
      const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `youtube-viral-videos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } else {
      if (savedChannels.length === 0) return alert("내보낼 채널이 없습니다.");
      const headers = "ID,채널명,구독자수,평균조회수,동영상수,URL\n";
      const rows = savedChannels
        .map(
          (c) =>
            [c.id,c.title,c.subscriberCount,c.averageViews,c.videoCount,`https://www.youtube.com/channel/${c.id}`].map(csvCell).join(",")
        )
        .join("\n");
      const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `youtube-golden-channels-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-yt-warn/10 text-yt-warn rounded-lg">
              <Bookmark className="w-5 h-5 fill-amber-500" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-yt-text">
              즐겨찾기 보관함
            </h1>
          </div>
          <p className="text-sm text-yt-muted mt-1">
            발굴한 떡상 쇼츠 영상과 황금 채널을 저장하고 CSV로 다운로드하여 벤치마킹 데이터베이스를 구축합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-yt-surface hover:bg-yt-hover text-yt-text border border-yt-border rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV 다운로드</span>
          </button>

        </div>
      </div>

      <p className="text-sm text-yt-muted">본인 계정에 저장한 자료만 표시합니다. 저장일 기준 30일 후 자동 삭제됩니다. 개별 북마크 버튼으로 해제할 수 있습니다.</p>
      {store?.loading && <p role="status">보관함을 불러오는 중입니다.</p>}
      {/* v1.16(A안): 보관함은 최신 1,000개까지만 불러온다(api/favorites limit) — 닿으면 안내 */}
      {!store?.loading && rows.length >= FAVORITES_LOAD_LIMIT && (
        <p role="status" className="rounded-lg border border-yt-warn/40 bg-yt-warn/10 px-3 py-2 text-xs text-yt-warn">
          ⚠️ 최신 {FAVORITES_LOAD_LIMIT.toLocaleString()}개만 표시됩니다. 오래된 항목은 저장일 기준 30일이 지나면 자동 삭제되니, 필요 없는 항목을 해제하거나 CSV로 내려받아 보관해 주세요.
        </p>
      )}
      {!store?.loading && !store?.error && rows.length === 0 && <p className="text-xs text-yt-muted">이전 브라우저 보관함은 소유자를 확인할 수 없어 자동으로 불러오지 않습니다.</p>}
      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 p-1.5 bg-yt-raised rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "videos"
              ? "bg-yt-surface text-yt-text shadow-xs"
              : "text-yt-muted hover:text-yt-text"
          }`}
        >
          영상 보관함 ({savedVideos.length})
        </button>
        <button
          onClick={() => setActiveTab("channels")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "channels"
              ? "bg-yt-surface text-yt-text shadow-xs"
              : "text-yt-muted hover:text-yt-text"
          }`}
        >
          채널 보관함 ({savedChannels.length})
        </button>
      </div>

      {/* 영상 목록 */}
      {!store?.loading && !store?.error && activeTab === "videos" && (
        <>
          {savedVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedVideos.map((v) => (
                <div key={v.id}><VideoCard video={v} isBookmarked={true} /><p className="mt-2 text-xs text-yt-muted">보관 기한: {new Date(Date.parse(rows.find(r=>r.item_type==='video'&&r.item_id===v.id)!.created_at)+FAVORITE_TTL_MS).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국 시간)</p></div>
              ))}
            </div>
          ) : (
            <div className="bg-yt-surface rounded-2xl border border-dashed border-yt-border p-12 text-center">
              <Bookmark className="w-8 h-8 text-yt-muted mx-auto mb-2" />
              <p className="text-sm font-semibold text-yt-muted mb-1">
                보관된 영상이 없습니다
              </p>
              <p className="text-xs text-yt-muted">
                [조회수 폭발 쇼츠 찾기] 또는 [실시간 터진 영상]에서 북마크 아이콘을 눌러 저장해보세요.
              </p>
            </div>
          )}
        </>
      )}

      {/* 채널 목록 */}
      {!store?.loading && !store?.error && activeTab === "channels" && (
        <>
          {savedChannels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedChannels.map((c) => (
                <div key={c.id}><ChannelCard channel={c} isBookmarked={true} /><p className="mt-2 text-xs text-yt-muted">보관 기한: {new Date(Date.parse(rows.find(r=>r.item_type==='channel'&&r.item_id===c.id)!.created_at)+FAVORITE_TTL_MS).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국 시간)</p></div>
              ))}
            </div>
          ) : (
            <div className="bg-yt-surface rounded-2xl border border-dashed border-yt-border p-12 text-center">
              <Users className="w-8 h-8 text-yt-muted mx-auto mb-2" />
              <p className="text-sm font-semibold text-yt-muted mb-1">
                보관된 채널이 없습니다
              </p>
              <p className="text-xs text-yt-muted">
                [황금 채널 발굴기]에서 마음에 드는 유망 채널을 저장해보세요.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
