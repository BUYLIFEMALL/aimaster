"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MediaCenter } from "./MediaCenter";
import { EditorStudio } from "./EditorStudio";
import { ExportStudio } from "./ExportStudio";
import { ApiKeyModal } from "./ApiKeyModal";
import { HelpModal } from "./HelpModal";
import { Track, StudioSettings, ExportSettings } from "@/types/playlist";
import { DEFAULT_SETTINGS, DEFAULT_EXPORT_SETTINGS } from "@/data/presets";

interface PlaylistStudioAppProps {
  userEmail?: string | null;
  userId?: string | null;
}

export function PlaylistStudioApp({ userEmail, userId }: PlaylistStudioAppProps) {
  const [currentTab, setCurrentTab] = useState<'media' | 'editor' | 'export'>('media');

  // Core Studio States
  const [tracks, setTracks] = useState<Track[]>([]);
  const [bgMedia, setBgMedia] = useState<{ type: 'image' | 'video'; url: string; name?: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);

  // Export progress
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Modals
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // Fetch API key on mount
  useEffect(() => {
    fetch("/api/user-key")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.maskedKey) {
          setMaskedKey(data.maskedKey);
        }
      })
      .catch((err) => console.error("Key fetch failed:", err));
  }, []);

  const handleSaveKey = async (key: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/user-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMaskedKey(data.maskedKey);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* 1. 좌측 통합 사이드바 */}
      <Sidebar
        currentTab={currentTab}
        setTab={setCurrentTab}
        onOpenApiKey={() => setIsApiKeyOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        userEmail={userEmail}
        trackCount={tracks.length}
        hasBackground={bgMedia !== null}
      />

      {/* 2. 중앙 메인 워크스페이스 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {currentTab === 'media' && (
          <MediaCenter
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
            onEnterStudio={() => setCurrentTab('editor')}
          />
        )}

        {currentTab === 'editor' && (
          <EditorStudio
            tracks={tracks}
            bgMedia={bgMedia}
            logoUrl={logoUrl}
            gifUrl={gifUrl}
            settings={settings}
            setSettings={setSettings}
            onExportClick={() => setCurrentTab('export')}
            isExporting={isExporting}
            exportProgress={exportProgress}
          />
        )}

        {currentTab === 'export' && (
          <ExportStudio
            tracks={tracks}
            bgMedia={bgMedia}
            logoUrl={logoUrl}
            settings={settings}
            exportSettings={exportSettings}
            setExportSettings={setExportSettings}
            onBackToEditor={() => setCurrentTab('editor')}
            isExporting={isExporting}
            setIsExporting={setIsExporting}
            exportProgress={exportProgress}
            setExportProgress={setExportProgress}
          />
        )}
      </div>

      {/* 모달들 */}
      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        maskedKey={maskedKey}
        onSaveKey={handleSaveKey}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
