"use client";

// 2026-10-20 병합 E: Youtube Playlist 자동화(yt-playlist-studio)의 PlaylistStudioApp을 이 앱 안 「영상 만들기」 화면으로 옮긴 것.
// 자체 사이드바·키 입력창은 빼고(기준 앱 좌측 메뉴·[API키등록·플랫폼연동] 사용) 위쪽 탭으로 음악·배경 → 편집 → 내보내기 → 사용법을 오간다.
// 렌더는 그대로 브라우저(GPU)에서 하며 서버에는 AI 배경 생성(/api/generate-bg, 회원 본인 Gemini 키)만 간다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { MediaCenter } from "./MediaCenter";
import { EditorStudio } from "./EditorStudio";
import { ExportStudio } from "./ExportStudio";
import { HelpModal } from "./HelpModal";
import { PlaylistGuideView } from "./PlaylistGuideView";
import type { Track, StudioSettings, ExportSettings } from "@/types/playlist";
import { DEFAULT_SETTINGS, DEFAULT_EXPORT_SETTINGS } from "@/data/presets";

type Tab = "media" | "editor" | "export" | "guide";
const TABS: { id: Tab; label: string }[] = [
  { id: "media", label: "① 음악·배경 넣기" },
  { id: "editor", label: "② 편집·미리보기" },
  { id: "export", label: "③ MP4 내보내기" },
  { id: "guide", label: "📖 사용법" },
];

export function VideoStudio({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("media");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "media" || t === "editor" || t === "export" || t === "guide") setTab(t);
  }, []);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [bgMedia, setBgMedia] = useState<{ type: "image" | "video"; url: string; name?: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-2rem)] min-h-[640px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] text-[#f1f1f1]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            disabled={isExporting && t.id !== "export"}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
              tab === t.id ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          곡 {tracks.length}개 · 배경 {bgMedia ? "있음" : "없음"} ·{" "}
          <Link href="/settings" className="text-cyan-400 hover:underline">AI 배경용 Gemini 키 등록</Link>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "guide" && (
          <PlaylistGuideView onGoToStudio={() => setTab("media")} onOpenApiKey={() => (window.location.href = "/settings")} />
        )}
        {tab === "media" && (
          <MediaCenter
            userId={userId}
            tracks={tracks}
            setTracks={setTracks}
            bgMedia={bgMedia}
            setBgMedia={setBgMedia}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            gifUrl={gifUrl}
            setGifUrl={setGifUrl}
            exportSettings={exportSettings}
            setExportSettings={setExportSettings}
            onEnterStudio={() => setTab("editor")}
          />
        )}
        {tab === "editor" && (
          <EditorStudio
            tracks={tracks}
            bgMedia={bgMedia}
            logoUrl={logoUrl}
            gifUrl={gifUrl}
            settings={settings}
            setSettings={setSettings}
            onExportClick={() => setTab("export")}
            isExporting={isExporting}
            exportProgress={exportProgress}
            aspect={exportSettings.aspect ?? "16:9"}
            setAspect={(a) => setExportSettings((p) => ({ ...p, aspect: a }))}
          />
        )}
        {tab === "export" && (
          <ExportStudio
            tracks={tracks}
            bgMedia={bgMedia}
            logoUrl={logoUrl}
            settings={settings}
            exportSettings={exportSettings}
            setExportSettings={setExportSettings}
            onBackToEditor={() => setTab("editor")}
            isExporting={isExporting}
            setIsExporting={setIsExporting}
            exportProgress={exportProgress}
            setExportProgress={setExportProgress}
          />
        )}
      </div>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
