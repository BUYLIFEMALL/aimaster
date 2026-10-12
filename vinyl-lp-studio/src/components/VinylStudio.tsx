"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ControlPanel } from "@/components/ControlPanel";
import { TurntableDisplay } from "@/components/TurntableDisplay";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { HelpModal } from "@/components/HelpModal";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { processDiscTexture } from "@/lib/render/canvas-texture";
import { renderSpinningAnimation } from "@/lib/render/media-exporter";
import type { VinylConfig, VinylState, HistoryItem } from "@/types/vinyl";

interface VinylStudioProps {
  userEmail?: string | null;
}

const LOCAL_STORAGE_KEY = "vinyl_lp_studio_history_v1";

export function VinylStudio({ userEmail }: VinylStudioProps) {
  // 메인 설정 및 렌더링 상태
  const [config, setConfig] = useState<VinylConfig>({
    title: "",
    artist: "",
    extraInfo: "",
    backgroundPrompt: "",
    mediaType: "vinyl",
    speed: 45,
    duration: 0.16666666666666666,
    cdCoverage: 1,
  });

  const [state, setState] = useState<VinylState>({
    ...config,
    rawImageBase64: null,
    generatedImageBase64: null,
    generatedVideoUrl: null,
    generatedVideoFormat: null,
    isGeneratingImage: false,
    isRenderingVideo: false,
    isSuggestingPrompt: false,
    loadingMessage: "",
    renderProgress: undefined,
    error: null,
  });

  // config 변경 시 state 동기화
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      ...config,
    }));
  }, [config]);

  // 모달 및 드로어 상태
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // 현재 활성 스텝 (사이드바 연동)
  const [activeStep, setActiveStep] = useState(1);

  // 로컬 작업 히스토리
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [exportFormat, setExportFormat] = useState<"mp4" | "gif" | null>(null);

  // 마운트 시 키 상태 및 히스토리 로드
  useEffect(() => {
    checkApiKeyStatus();

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setHistoryItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("히스토리 로드 실패:", e);
    }
  }, []);

  // 스크롤 위치 감지 (사이드바 활성화 동기화)
  useEffect(() => {
    const stepIds = ["step-1-metadata", "step-2-artwork", "step-3-turntable", "step-4-export"];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = stepIds.indexOf(entry.target.id);
            if (idx !== -1) setActiveStep(idx + 1);
          }
        });
      },
      { threshold: 0.3, rootMargin: "-10% 0px -50% 0px" }
    );

    stepIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const checkApiKeyStatus = async () => {
    try {
      const res = await fetch("/api/user-key");
      const data = await res.json();
      setHasApiKey(data.hasKey || false);
      setMaskedKey(data.maskedKey || null);
    } catch (err) {
      console.error("API 키 상태 확인 실패:", err);
    }
  };

  const handleSaveApiKey = async (newKey: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/user-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newKey }),
      });
      const data = await res.json();
      if (data.success) {
        setHasApiKey(true);
        setMaskedKey(data.maskedKey);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 1. AI 비주얼 스타일 추천
  const handleSuggestPrompt = async () => {
    if (!config.title && !config.artist && !config.extraInfo) {
      alert("앨범 제목, 아티스트 이름 또는 장르를 먼저 입력해주세요.");
      return;
    }

    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setState((prev) => ({ ...prev, isSuggestingPrompt: true, error: null }));
    try {
      const res = await fetch("/api/suggest-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: config.title,
          artist: config.artist,
          extraInfo: config.extraInfo,
          mediaType: config.mediaType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needKey) setIsApiKeyModalOpen(true);
        throw new Error(data.error || "스타일 추천 실패");
      }

      if (data.prompt) {
        setConfig((prev) => ({ ...prev, backgroundPrompt: data.prompt }));
      }
    } catch (err: any) {
      alert(err.message || "스타일 추천 중 오류가 발생했습니다.");
    } finally {
      setState((prev) => ({ ...prev, isSuggestingPrompt: false }));
    }
  };

  // 포맷 전환 시 텍스처 재마스킹
  useEffect(() => {
    if (state.rawImageBase64) {
      processDiscTexture(state.rawImageBase64, config.mediaType)
        .then((textured) => {
          setState((prev) => ({ ...prev, generatedImageBase64: textured }));
        })
        .catch((e) => console.error("텍스처 재처리 오류:", e));
    }
  }, [config.mediaType]);

  // 2. 디자인 생성하기 (Gemini/Imagen 앨범 아트워크 생성)
  const handleGenerateArtwork = async () => {
    if (!config.title || !config.artist) {
      alert("앨범 제목과 아티스트 이름을 입력해주세요.");
      return;
    }

    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setState((prev) => ({
      ...prev,
      isGeneratingImage: true,
      loadingMessage: "Gemini AI로 앨범 아트워크 생성 중...",
      error: null,
      generatedVideoUrl: null,
      generatedVideoFormat: null,
    }));

    try {
      const res = await fetch("/api/generate-artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needKey) setIsApiKeyModalOpen(true);
        throw new Error(data.error || "이미지 생성 실패");
      }

      const rawBase64 = data.imageBase64;
      setState((prev) => ({ ...prev, loadingMessage: "디스크 마스킹 및 텍스처 합성 중..." }));

      // 캔버스 마스킹 처리 (LP 그루브 / CD 홀로그램)
      const texturedBase64 = await processDiscTexture(rawBase64, config.mediaType);

      setState((prev) => ({
        ...prev,
        rawImageBase64: rawBase64,
        generatedImageBase64: texturedBase64,
        isGeneratingImage: false,
        loadingMessage: "",
      }));

      // 히스토리 저장
      saveHistory(texturedBase64);
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isGeneratingImage: false,
        loadingMessage: "",
        error: err.message,
      }));
      alert(err.message || "앨범 아트 생성 중 오류가 발생했습니다.");
    }
  };

  // 3. 커스텀 이미지 직접 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setState((prev) => ({
      ...prev,
      isGeneratingImage: true,
      loadingMessage: "이미지 처리 및 텍스처 마스킹 중...",
      error: null,
      generatedVideoUrl: null,
      generatedVideoFormat: null,
    }));

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const rawBase64 = (reader.result as string).split(",")[1];
        const texturedBase64 = await processDiscTexture(rawBase64, config.mediaType);

        setState((prev) => ({
          ...prev,
          rawImageBase64: rawBase64,
          generatedImageBase64: texturedBase64,
          isGeneratingImage: false,
          loadingMessage: "",
        }));

        saveHistory(texturedBase64);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setState((prev) => ({ ...prev, isGeneratingImage: false, loadingMessage: "" }));
      alert("이미지 업로드 처리 실패: " + err.message);
    }
  };

  // 4. 고화질 MP4 / GIF 렌더링 내보내기
  const handleRenderExport = async (format: "mp4" | "gif") => {
    if (!state.generatedImageBase64) return;

    setExportFormat(format);
    setState((prev) => ({
      ...prev,
      isRenderingVideo: true,
      loadingMessage:
        format === "mp4"
          ? "브라우저에서 60fps MP4 비디오 렌더링 중..."
          : "무한 루프 GIF 생성 중...",
      renderProgress: 0,
      error: null,
    }));

    try {
      const videoUrl = await renderSpinningAnimation({
        imageBase64: state.generatedImageBase64,
        speedRpm: config.speed,
        durationSec: 0.16666666666666666,
        mediaType: config.mediaType,
        format,
        onProgress: (p) => setState((prev) => ({ ...prev, renderProgress: p })),
      });

      setState((prev) => ({
        ...prev,
        isRenderingVideo: false,
        loadingMessage: "",
        generatedVideoUrl: videoUrl,
        generatedVideoFormat: format,
        renderProgress: undefined,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isRenderingVideo: false,
        loadingMessage: "",
        renderProgress: undefined,
        error: err.message,
      }));
      alert(err.message || "영상 내보내기 중 오류가 발생했습니다.");
    } finally {
      setExportFormat(null);
    }
  };

  const saveHistory = (thumbnailBase64: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      title: config.title || "Untitled",
      artist: config.artist || "Unknown",
      mediaType: config.mediaType,
      speed: config.speed,
      imageThumbnail: thumbnailBase64,
      prompt: config.backgroundPrompt,
    };

    const updated = [newItem, ...historyItems.slice(0, 19)];
    setHistoryItems(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("히스토리 저장 실패:", e);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setConfig((prev) => ({
      ...prev,
      title: item.title,
      artist: item.artist,
      mediaType: item.mediaType,
      speed: item.speed,
      backgroundPrompt: item.prompt,
    }));
    setState((prev) => ({
      ...prev,
      rawImageBase64: item.imageThumbnail,
      generatedImageBase64: item.imageThumbnail,
      generatedVideoUrl: null,
      generatedVideoFormat: null,
    }));
    setIsHistoryOpen(false);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = historyItems.filter((i) => i.id !== id);
    setHistoryItems(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    if (confirm("모든 히스토리를 삭제하시겠습니까?")) {
      setHistoryItems([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const handleReset = () => {
    if (confirm("설정을 초기화하시겠습니까?")) {
      setConfig({
        title: "",
        artist: "",
        extraInfo: "",
        backgroundPrompt: "",
        mediaType: "vinyl",
        speed: 45,
        duration: 0.16666666666666666,
        cdCoverage: 1,
      });
      setState({
        title: "",
        artist: "",
        extraInfo: "",
        backgroundPrompt: "",
        mediaType: "vinyl",
        speed: 45,
        duration: 0.16666666666666666,
        cdCoverage: 1,
        rawImageBase64: null,
        generatedImageBase64: null,
        generatedVideoUrl: null,
        generatedVideoFormat: null,
        isGeneratingImage: false,
        isRenderingVideo: false,
        isSuggestingPrompt: false,
        loadingMessage: "",
        renderProgress: undefined,
        error: null,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden font-sans">
      {/* 1. AIMaster 표준 좌측 사이드바 */}
      <Sidebar
        userEmail={userEmail}
        activeStep={activeStep}
        onSelectStep={setActiveStep}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* 2. 중앙 옵션 컨트롤 패널 */}
      <ControlPanel
        config={config}
        setConfig={setConfig}
        onGenerateArtwork={handleGenerateArtwork}
        onSuggestPrompt={handleSuggestPrompt}
        onFileUpload={handleFileUpload}
        onRenderExport={handleRenderExport}
        isLoading={state.isGeneratingImage}
        isSuggesting={state.isSuggestingPrompt}
        isExporting={state.isRenderingVideo}
        exportFormat={exportFormat}
        hasArtwork={Boolean(state.generatedImageBase64)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={historyItems.length}
        hasApiKey={hasApiKey}
      />

      {/* 3. 우측 턴테이블 뷰어 및 내보내기 디스플레이 */}
      <TurntableDisplay state={state} onReset={handleReset} />

      {/* 모달 컴포넌트들 */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        maskedKey={maskedKey}
        onSaveKey={handleSaveApiKey}
      />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={historyItems}
        onSelect={handleSelectHistoryItem}
        onDelete={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
