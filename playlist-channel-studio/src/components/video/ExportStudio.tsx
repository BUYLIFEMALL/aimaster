"use client";

import { useState } from "react";
import {
  Video,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { Track, StudioSettings, ExportSettings } from "@/types/playlist";
import { exportVideoMp4, RenderProgress } from "@/lib/render/video-exporter";

interface ExportStudioProps {
  tracks: Track[];
  bgMedia: { type: 'image' | 'video'; url: string } | null;
  logoUrl: string | null;
  settings: StudioSettings;
  exportSettings: ExportSettings;
  setExportSettings: React.Dispatch<React.SetStateAction<ExportSettings>>;
  onBackToEditor: () => void;
  isExporting: boolean;
  setIsExporting: (val: boolean) => void;
  exportProgress: number;
  setExportProgress: (val: number) => void;
}

export function ExportStudio({
  tracks,
  bgMedia,
  logoUrl,
  settings,
  exportSettings,
  setExportSettings,
  onBackToEditor,
  isExporting,
  setIsExporting,
  exportProgress,
  setExportProgress,
}: ExportStudioProps) {
  const [statusText, setStatusText] = useState("렌더링 대기 중");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate single pass and total duration
  const singlePassDuration = tracks.reduce((acc, t) => acc + t.duration, 0);
  const totalDuration = singlePassDuration * exportSettings.repeatCount;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}시간 ${mins % 60}분 ${s}초`;
    }
    return `${mins}분 ${s}초`;
  };

  const startExport = async () => {
    if (tracks.length === 0) {
      alert("렌더링할 오디오 트랙이 없습니다.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setDownloadUrl(null);
    setErrorMessage(null);
    setStatusText("비디오 렌더링 초기화 중...");

    try {
      let logoImg: HTMLImageElement | null = null;
      if (logoUrl) {
        logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = logoUrl;
        await new Promise((r) => { logoImg!.onload = r; logoImg!.onerror = r; });
      }

      const blob = await exportVideoMp4(
        tracks,
        bgMedia,
        logoImg,
        settings,
        exportSettings,
        (p: RenderProgress) => {
          setExportProgress(p.progress);
          setStatusText(p.status);
        }
      );

      if (blob) {
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        // Auto trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `youtube_playlist_${Date.now()}.mp4`;
        a.click();
      }
    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMessage(err.message || "렌더링 중 오류가 발생했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0f0f0f] text-[#f1f1f1] p-6 md:p-12 space-y-8 flex flex-col items-center custom-scrollbar">
      <div className="w-full max-w-2xl border-b border-[#272727] pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-9 items-center justify-center rounded-lg bg-[#ff0000] text-white shadow-md shadow-red-950">
              <Film className="w-4 h-4 fill-current" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              내보내기 & 렌더링
            </h2>
          </div>
          <p className="text-xs text-[#aaaaaa] mt-1.5">
            WebCodecs 브라우저 GPU 가속 1080p 고속 MP4 인코딩
          </p>
        </div>
        <button
          onClick={onBackToEditor}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#181818] text-white border border-[#272727] rounded-xl hover:bg-[#212121] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>스튜디오로 돌아가기</span>
        </button>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {/* 요약 카드 */}
        <div className="bg-[#181818] rounded-2xl border border-[#272727] p-6 space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-[#ff0000] rounded-full inline-block" />
            렌더링 파라미터 요약
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-[#212121] rounded-xl border border-[#272727]">
              <span className="text-[10px] font-bold text-[#aaaaaa]">총 트랙 수</span>
              <p className="text-sm font-extrabold text-white mt-0.5">{tracks.length}곡</p>
            </div>
            <div className="p-3 bg-[#212121] rounded-xl border border-[#272727]">
              <span className="text-[10px] font-bold text-[#aaaaaa]">반복 횟수</span>
              <p className="text-sm font-extrabold text-[#ff4e45] mt-0.5">{exportSettings.repeatCount}회 루프</p>
            </div>
            <div className="p-3 bg-[#212121] rounded-xl border border-[#272727]">
              <span className="text-[10px] font-bold text-[#aaaaaa]">최종 영상 길이</span>
              <p className="text-sm font-extrabold text-white mt-0.5">{formatTime(totalDuration)}</p>
            </div>
            <div className="p-3 bg-[#212121] rounded-xl border border-[#272727]">
              <span className="text-[10px] font-bold text-[#aaaaaa]">해상도 / FPS</span>
              <p className="text-sm font-extrabold text-white mt-0.5 font-mono">{exportSettings.aspect === "9:16" ? "세로 " : ""}{exportSettings.resolution} / {exportSettings.fps}fps</p>
            </div>
          </div>

          {/* 옵션 설정 */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#272727]">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#aaaaaa]">프레임레이트</label>
              <div className="grid grid-cols-2 gap-2">
                {[30, 60].map((f) => (
                  <button
                    key={f}
                    onClick={() => setExportSettings((p) => ({ ...p, fps: f }))}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      exportSettings.fps === f
                        ? "bg-[#ff0000] text-white border-[#ff0000] shadow-md shadow-red-950"
                        : "bg-[#212121] text-[#aaaaaa] border-[#272727] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    {f} FPS
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#aaaaaa]">해상도</label>
              <div className="grid grid-cols-2 gap-2">
                {(['1080p', '720p'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setExportSettings((p) => ({ ...p, resolution: r }))}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      exportSettings.resolution === r
                        ? "bg-[#ff0000] text-white border-[#ff0000] shadow-md shadow-red-950"
                        : "bg-[#212121] text-[#aaaaaa] border-[#272727] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* v1.17 화면 모양 — 세로는 쇼츠·릴스용(1080×1920 / 720×1280), 배경은 잘라 맞춤 */}
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold text-[#aaaaaa]">화면 모양</label>
              <div className="grid grid-cols-2 gap-2">
                {([["16:9", "🖥️ 가로 16:9 (유튜브)"], ["9:16", "📱 세로 9:16 (쇼츠·릴스)"]] as const).map(([a, label]) => (
                  <button
                    key={a}
                    onClick={() => setExportSettings((p) => ({ ...p, aspect: a }))}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      (exportSettings.aspect ?? "16:9") === a
                        ? "bg-[#ff0000] text-white border-[#ff0000] shadow-md shadow-red-950"
                        : "bg-[#212121] text-[#aaaaaa] border-[#272727] hover:bg-[#272727] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 렌더링 진행 상황 카드 */}
        <div className="bg-[#181818] rounded-2xl border border-[#272727] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#aaaaaa]">렌더링 상태</span>
            <span className="text-xs font-extrabold text-[#ff4e45] font-mono">
              {exportProgress}%
            </span>
          </div>

          <div className="w-full bg-[#272727] rounded-full h-3 overflow-hidden p-0.5">
            <div
              className="bg-[#ff0000] h-full rounded-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>

          <p className="text-xs text-[#aaaaaa] font-medium text-center">
            {statusText}
          </p>

          {errorMessage && (
            <div className="p-3 bg-rose-950/50 border border-rose-900/50 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {downloadUrl && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-900/40 text-emerald-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">비디오 렌더링이 완료되었습니다!</span>
              </div>
              <a
                href={downloadUrl}
                download={`youtube_playlist_${Date.now()}.mp4`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>재다운로드</span>
              </a>
            </div>
          )}

          <button
            onClick={startExport}
            disabled={isExporting || tracks.length === 0}
            className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              isExporting
                ? "bg-[#272727] text-[#777777] cursor-wait"
                : "bg-[#ff0000] hover:bg-[#cc0000] text-white cursor-pointer shadow-red-950"
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>MP4 렌더링 진행 중... ({exportProgress}%)</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>비디오 렌더링 시작 (1080p MP4)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
