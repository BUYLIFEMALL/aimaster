"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ControlPanel } from "@/components/ControlPanel";
import { ImageDisplay } from "@/components/ImageDisplay";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { GuideView } from "@/components/GuideView";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import type { InfluencerConfig, GenerationResult, HistoryItem } from "@/types/influencer";

interface InfluencerStudioProps {
  userEmail?: string | null;
}

const LOCAL_STORAGE_KEY = "ai_influencer_history_v1";

export function InfluencerStudio({ userEmail }: InfluencerStudioProps) {
  // 인플루언서 설정 기본값 (기본 선택은 아무것도 안 되어 있는 값)
  const [config, setConfig] = useState<InfluencerConfig>({
    gender: "",
    ethnicity: "",
    age: "",
    hairStyle: "",
    faceStyle: "",
    expression: "",
    pose: "",
    outfit: "",
    location: "",
    lighting: "",
    camera: "",
    filmStock: "",
    skin: [], // 기본 선택 없음
    aspectRatio: "9:16",
    quality: "1K",
    isAdMode: false,
    adType: "group_buy",
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
  // 📖 매뉴얼은 팝업 대신 화면 안에서 보여 준다(2026-10-17 디자인 리뉴얼). 입력 패널은 숨기기만 해서 입력값이 유지된다.
  const [showGuide, setShowGuide] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // 활성 스텝 (사이드바 1~5 연동)
  const [activeStep, setActiveStep] = useState(1);

  // 작업 히스토리 목록
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  // 마운트 시 사용자 API 키 상태 및 로컬 히스토리 로드
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

  // 컨트롤 패널 내 스텝 스크롤 위치 감지 (사이드바 활성화 동기화)
  useEffect(() => {
    const stepIds = [
      "step-1-appearance",
      "step-2-routine",
      "step-3-styling",
      "step-4-admode",
      "step-5-generate",
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = stepIds.indexOf(entry.target.id);
            if (idx !== -1) {
              setActiveStep(idx + 1);
            }
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

    const updated = [newItem, ...historyItems.slice(0, 29)];
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

  // 이미지 & 캡션 생성 실행 함수
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

  // 캡션 단독 재생성 / 피드백
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
    <div className="min-h-screen flex flex-col md:flex-row bg-if-bg overflow-hidden font-sans">
      {/* 1. AIMaster 표준 좌측 사이드바 (지침 준수) */}
      <Sidebar
        userEmail={userEmail}
        activeStep={activeStep}
        onSelectStep={(step) => {
          setShowGuide(false);
          setActiveStep(step);
        }}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenHelpModal={() => setShowGuide(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        guideActive={showGuide}
      />

      {showGuide && <GuideView onStart={() => setShowGuide(false)} />}

      {/* 2. 중앙 옵션 컨트롤 패널 (매뉴얼을 볼 때는 숨기기만 한다) */}
      <div className={showGuide ? "hidden" : "contents"}>
        <ControlPanel
          config={config}
          setConfig={setConfig}
          onGenerate={() => handleGenerate()}
          isLoading={result.loading}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          onOpenHelpModal={() => setShowGuide(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          historyCount={historyItems.length}
          hasApiKey={hasApiKey}
        />

        {/* 3. 우측 뷰어 & 캡션 스튜디오 */}
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
