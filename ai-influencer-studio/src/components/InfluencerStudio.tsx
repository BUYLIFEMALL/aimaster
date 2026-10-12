"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ControlPanel } from "@/components/ControlPanel";
import { ImageDisplay } from "@/components/ImageDisplay";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { HelpModal } from "@/components/HelpModal";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import type { InfluencerConfig, GenerationResult, HistoryItem } from "@/types/influencer";

interface InfluencerStudioProps {
  userEmail?: string | null;
}

const LOCAL_STORAGE_KEY = "ai_influencer_history_v1";

export function InfluencerStudio({ userEmail }: InfluencerStudioProps) {
  // 인플루언서 설정 기본값
  const [config, setConfig] = useState<InfluencerConfig>({
    gender: "female",
    ethnicity: "kr",
    age: "24",
    hairStyle: "l_str_b",
    faceStyle: "elegant",
    expression: "soft gentle smile",
    pose: "holding a gimbal stabilizer while walking for a POV selfie",
    outfit: "oversized white crisp button-up shirt",
    location: "cozy sunlight-filled bedroom",
    lighting: "m_win",
    camera: "iphone_rear",
    filmStock: "p_400",
    skin: ["pore", "glow"],
    aspectRatio: "9:16",
    quality: "1K",
    isAdMode: false,
    productImages: [],
  });

  // 생성 결과 상태
  const [result, setResult] = useState<GenerationResult>({
    imageUrl: null,
    captions: [],
    loading: false,
    error: null,
  });

  // 모달 및 드로어 상태
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // 작업 히스토리 목록
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  // 1. 마운트 시 사용자 API 키 상태 및 로컬 히스토리 로드
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

  // API 키 저장 핸들러
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

  // 히스토리 로컬스토리지 저장
  const saveToHistory = (imageUrl: string, captions: string[], usedConfig: InfluencerConfig) => {
    const newItem: HistoryItem = {
      id: "hist_" + Date.now(),
      timestamp: new Date().toLocaleString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      imageUrl,
      captions,
      config: usedConfig,
      summary: `${usedConfig.age}세 ${usedConfig.ethnicity === "kr" ? "한국인" : "모델"} · ${usedConfig.location.slice(0, 15)}`,
    };

    const updated = [newItem, ...historyItems.slice(0, 29)]; // 최대 30개
    setHistoryItems(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("히스토리 저장 실패:", e);
    }
  };

  // 히스토리 항목 선택
  const handleSelectHistoryItem = (item: HistoryItem) => {
    setResult({
      imageUrl: item.imageUrl,
      captions: item.captions,
      loading: false,
      error: null,
    });
    setConfig(item.config);
    setIsHistoryOpen(false);
  };

  // 히스토리 삭제
  const handleDeleteHistoryItem = (id: string) => {
    const updated = historyItems.filter((item) => item.id !== id);
    setHistoryItems(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  // 히스토리 전체 비우기
  const handleClearAllHistory = () => {
    if (confirm("모든 작업 히스토리를 삭제하시겠습니까?")) {
      setHistoryItems([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  // 2. 이미지 & 캡션 생성 실행 함수
  const handleGenerate = async (refinementFeedback?: string) => {
    if (!hasApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    const isRefining = !!refinementFeedback;

    setResult((prev) => ({
      ...prev,
      loading: true,
      error: null,
      imageUrl: isRefining ? prev.imageUrl : null,
      captions: isRefining ? prev.captions : [],
    }));

    const configToSubmit: InfluencerConfig = {
      ...config,
      feedback: refinementFeedback,
      lastResultImage: isRefining ? result.imageUrl || undefined : undefined,
    };

    try {
      // 1) 이미지 생성 호출
      const imgRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSubmit),
      });

      const imgData = await imgRes.json();
      if (!imgRes.ok) {
        if (imgData.needApiKey) {
          setIsApiKeyModalOpen(true);
        }
        throw new Error(imgData.error || "이미지 생성 실패");
      }

      const generatedImageUrl = imgData.imageUrl;

      // 2) 캡션 생성 병렬 호출
      let generatedCaptions: string[] = [];
      try {
        const capRes = await fetch("/api/generate-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: configToSubmit, refinementRequest: refinementFeedback }),
        });
        const capData = await capRes.json();
        if (capData.success) {
          generatedCaptions = capData.captions;
        }
      } catch (capErr) {
        console.warn("캡션 생성 실패:", capErr);
      }

      setResult({
        imageUrl: generatedImageUrl,
        captions: generatedCaptions,
        loading: false,
        error: null,
      });

      // 직전 결과물 보관 & 히스토리 기록
      setConfig((prev) => ({
        ...prev,
        lastResultImage: generatedImageUrl,
        feedback: undefined,
      }));

      saveToHistory(generatedImageUrl, generatedCaptions, configToSubmit);
    } catch (err: any) {
      setResult((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "오류가 발생했습니다.",
      }));
      alert(err.message || "이미지 생성 중 오류가 발생했습니다.");
    }
  };

  // 3. 캡션 단독 재생성 / 피드백
  const handleRegenerateCaption = async (captionFeedback: string) => {
    setIsGeneratingCaption(true);
    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, refinementRequest: captionFeedback }),
      });
      const data = await res.json();
      if (data.success && data.captions) {
        setResult((prev) => ({ ...prev, captions: data.captions }));
      }
    } catch (err) {
      console.error("캡션 재생성 실패:", err);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 최상단 헤더 */}
      <Header
        userEmail={userEmail}
        hasApiKey={hasApiKey}
        historyCount={historyItems.length}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* 메인 스튜디오 본문 (좌: 컨트롤 패널 / 우: 뷰어 & 캡션) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <ControlPanel
          config={config}
          setConfig={setConfig}
          onGenerate={() => handleGenerate()}
          isLoading={result.loading}
        />
        <ImageDisplay
          result={result}
          onRefineImage={(feedback) => handleGenerate(feedback)}
          onRegenerateCaption={handleRegenerateCaption}
          isGeneratingCaption={isGeneratingCaption}
        />
      </div>

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
