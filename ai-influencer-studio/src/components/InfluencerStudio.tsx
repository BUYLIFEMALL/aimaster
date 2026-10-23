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
  /** v1.21 「🗓 하루 일과 자동 예약」 표시 여부(서버가 src/lib/routineSchedule.ts 스위치로 판정) */
  routineScheduleEnabled?: boolean;
}

const LOCAL_STORAGE_KEY = "ai_influencer_history_v1"; // v1.20부터는 예전 브라우저 히스토리를 계정으로 옮길 때만 읽는다

// v1.20 작업 히스토리는 회원 계정(/api/history)에 저장 — 다른 PC·브라우저에서도 보인다(최근 30개, 30일 보관).
const formatHistoryTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 저장용으로 긴 변 1440px JPEG로 줄인다(원본 PNG base64는 서버 요청 한도를 넘을 수 있음) */
function toHistoryJpeg(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, 1440 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("이미지를 줄이지 못했습니다.")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    img.src = src;
  });
}

type ServerHistory = { id: string; createdAt: string; imageUrl: string; captions: string[]; config: InfluencerConfig; summary: string };
const fromServer = (h: ServerHistory): HistoryItem => ({ id: h.id, timestamp: formatHistoryTime(h.createdAt), imageUrl: h.imageUrl, captions: h.captions ?? [], config: h.config, summary: h.summary });

async function postHistory(imageSrc: string, captions: string[], config: InfluencerConfig, summary: string): Promise<HistoryItem | null> {
  const image = await toHistoryJpeg(imageSrc);
  // 사진 데이터(얼굴·장소·상품 사진, 직전 결과)는 보내지 않는다 — 글자 설정만 저장(서버도 한 번 더 뺀다)
  const { personImage: _p, placeImage: _l, productImages: _i, lastResultImage: _r, ...textConfig } = config ?? ({} as InfluencerConfig);
  void _p; void _l; void _i; void _r;
  const res = await fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, captions, config: textConfig, summary }) });
  if (!res.ok) return null;
  const d = await res.json();
  return d.item ? fromServer(d.item) : null;
}

export function InfluencerStudio({ userEmail, routineScheduleEnabled = false }: InfluencerStudioProps) {
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

    void (async () => {
      const load = async () => {
        const res = await fetch("/api/history", { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        setHistoryItems(((d.items ?? []) as ServerHistory[]).map(fromServer));
      };
      try {
        await load();
        // 예전 브라우저 히스토리가 남아 있으면 오래된 것부터 계정으로 옮기고 브라우저에서 지운다
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        const local = saved ? (JSON.parse(saved) as HistoryItem[]) : [];
        if (local.length) {
          let moved = 0;
          for (const item of [...local].reverse()) {
            if (item?.imageUrl && (await postHistory(item.imageUrl, item.captions ?? [], item.config, item.summary ?? "").catch(() => null))) moved++;
          }
          if (moved === local.length) localStorage.removeItem(LOCAL_STORAGE_KEY);
          await load();
        }
      } catch (e) {
        console.warn("히스토리 로드 실패:", e);
      }
    })();
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

    // 화면에는 바로 보이고, 계정 저장이 끝나면 서버 값(id·보기 주소)으로 바꾼다
    setHistoryItems((cur) => [newItem, ...cur.slice(0, 29)]);
    void postHistory(imageUrl, captions, usedConfig, newItem.summary)
      .then((saved) => { if (saved) setHistoryItems((cur) => cur.map((h) => (h.id === newItem.id ? saved : h))); })
      .catch((e) => console.warn("히스토리 저장 실패:", e));
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
    setHistoryItems((cur) => cur.filter((item) => item.id !== id));
    if (!id.startsWith("hist_")) void fetch(`/api/history?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
  };

  // 히스토리 전체 비우기
  const handleClearAllHistory = () => {
    if (confirm("모든 작업 히스토리를 삭제하시겠습니까?")) {
      setHistoryItems([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      void fetch("/api/history?all=1", { method: "DELETE" }).catch(() => undefined);
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
          history={historyItems}
          onOpenSettings={() => setIsApiKeyModalOpen(true)}
          routineScheduleEnabled={routineScheduleEnabled}
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
