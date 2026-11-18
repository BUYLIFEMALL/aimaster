"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ControlPanel } from "@/components/ControlPanel";
import { ImageDisplay } from "@/components/ImageDisplay";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { GuideView } from "@/components/GuideView";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import type { InfluencerConfig, GenerationResult, HistoryItem } from "@/types/influencer";
import { assetSaveNotice } from "@/lib/assets/saveNotice";
import { readGenerateResponse } from "@/lib/assets/generateResponse";
import { collectReferences, prepareLastResultForRefine, referenceErrorMessage } from "@/lib/referenceImage";
import { AssetFlowSession, CLIENT_MESSAGES, SESSION_MESSAGES, keepPhotosIfLocked, stripPhotoFields } from "@/lib/assets/clientFlow";

interface InfluencerStudioProps {
  userEmail?: string | null;
  /** v1.21 「🗓 하루 일과 자동 예약」 표시 여부(서버가 src/lib/routineSchedule.ts 스위치로 판정) */
  routineScheduleEnabled?: boolean;
  /** 자산 번호 흐름(W01-UII): 서버가 모드 상수(AIF_ASSETS_MODE)로 판정해 넘긴다. 지금은 항상 false — 그때 이 화면은 기존 흐름만 쓴다 */
  assetFlow?: boolean;
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

export function InfluencerStudio({ userEmail, routineScheduleEnabled = false, assetFlow = false }: InfluencerStudioProps) {
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

  // ── 자산 번호 흐름(W01-UII, assetFlow일 때만) ──
  // 세션은 화면·계정 단위다: 계정이 바뀌거나 화면을 떠나면 끝낸다(진행 중 요청 취소 + 메모리 사본 주소 해제 + 번호 기억 삭제).
  // 세대 확인·취소·중복 방지는 세션(src/lib/assets/clientFlow.ts)이 한다. assetFlow가 false면 세션을 만들지 않고 아래 코드는 기존 흐름과 같다.
  const sessionRef = useRef<AssetFlowSession | null>(null);
  const [isReloadingAsset, setIsReloadingAsset] = useState(false);
  useEffect(() => {
    if (!assetFlow) return;
    const session = new AssetFlowSession({
      fetch: (input, init) => fetch(input, init),
      storageOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      createObjectURL: (blob) => URL.createObjectURL(blob),
      revokeObjectURL: (url) => URL.revokeObjectURL(url),
    });
    sessionRef.current = session;
    return () => {
      session.dispose();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [assetFlow, userEmail]);
  // 참고 사진이 바뀌면 세션에 알린다 — 올리는 중이던 작업은 취소된다(생성 요청이 나간 뒤에는 아래 setConfigGuarded가 변경 자체를 막는다)
  useEffect(() => {
    sessionRef.current?.photosChanged();
  }, [config.personImage, config.placeImage, config.productImages, config.isAdMode]);
  // 생성 요청이 나간 동안에는 참고 사진 칸의 변경을 받지 않는다(그 밖의 칸은 그대로). assetFlow가 아니면 쓰이지 않는다
  const setConfigGuarded: typeof setConfig = (value) =>
    setConfig((prev) => keepPhotosIfLocked(prev, typeof value === "function" ? value(prev) : value, !!sessionRef.current?.locked));

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
    sessionRef.current?.clearResult();   // 화면이 히스토리 항목으로 바뀐다 — 메모리 사본을 놓는다(assetFlow가 아니면 세션이 없다)
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

    // W01c(2026-11-18): 보정은 방금 만든 결과(data URL)만 보낸다 — 히스토리에서 불러온 결과(서명 주소)는 보내지 않고 안내.
    // 큰 결과는 보내기 전에 JPEG(긴 변 2048, 1MB 이하)로 맞춘다. 정상 새 생성 경로는 그대로.
    let lastResultImage: string | undefined;
    if (isRefining) {
      // 자산 번호 흐름의 결과는 메모리 사본(blob:)이다 — 보정에는 지금처럼 data URL이 필요하므로 사본을 data URL로 바꿔 넘긴다. 보정 자체는 기존 경로 그대로다
      let refineSource = result.imageUrl;
      if (assetFlow && sessionRef.current?.hasResultCopy) refineSource = await sessionRef.current.resultDataUrl();
      else if (assetFlow && result.needsReload) {
        setResult((prev) => ({ ...prev, loading: false, error: SESSION_MESSAGES.NO_COPY }));
        return;
      }
      const prepared = await prepareLastResultForRefine(refineSource);
      if (!prepared.ok) {
        setResult((prev) => ({ ...prev, loading: false, error: prepared.message }));
        return;
      }
      lastResultImage = prepared.dataUrl;
    }

    const configToSubmit: InfluencerConfig = {
      ...config,
      feedback: refinementFeedback,
      lastResultImage,
    };

    // 서버와 같은 형식·크기 검사를 보내기 전에 한 번 — 걸리면 요청하지 않는다(유료 호출 없음, 서버도 다시 검사)
    const refCheck = collectReferences(configToSubmit as unknown as Record<string, unknown>);
    if (!refCheck.ok) {
      setResult((prev) => ({ ...prev, loading: false, error: referenceErrorMessage(refCheck.code, refCheck.field) }));
      return;
    }

    // 자산 번호 흐름: 새 생성만 새 경로로 간다. 보정은 아래의 기존 경로 그대로(사진 data URL + lastResultImage)
    if (assetFlow && !isRefining) {
      await handleGenerateWithAssets(configToSubmit);
      return;
    }

    setResult((prev) => ({
      ...prev,
      loading: true,
      error: null,
      imageUrl: isRefining ? prev.imageUrl : null,
      captions: isRefining ? prev.captions : [],
      assetNotice: null,   // 앞 결과의 저장 안내는 새 생성을 시작할 때 지운다
    }));

    try {
      // 1) 이미지 생성 호출
      const imgRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSubmit),
      });

      // 응답 해석은 한 곳에서(W01x): JSON이 아니거나 이미지가 실리지 않은 응답은 고정 문구로 끝낸다 —
      // 아래의 캡션 호출·결과 표시·히스토리 기록으로 넘어가지 않고, 다시 생성하지도 않는다.
      const outcome = await readGenerateResponse(imgRes);
      if (outcome.kind !== "image") {
        if (outcome.kind === "error" && outcome.needApiKey) {
          setIsApiKeyModalOpen(true);
        }
        throw new Error(outcome.message);
      }
      const imgData = outcome.body;

      const generatedImageUrl = outcome.imageUrl;
      // 원본 저장 결과 안내(W01v). 응답에 assetSaved가 없으면 null이라 화면이 예전과 같다. 안내만 한다 — 다시 생성·조회를 시작하지 않는다.
      const assetNotice = assetSaveNotice(imgData);

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

      sessionRef.current?.clearResult();   // 기존 경로의 결과(data URL)로 바뀐다 — 앞 결과의 메모리 사본을 놓는다(assetFlow가 아니면 세션이 없다)
      setResult({
        imageUrl: generatedImageUrl,
        captions: generatedCaptions,
        loading: false,
        error: null,
        ...(assetNotice ? { assetNotice } : {}),
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

  // ── 자산 번호 흐름의 새 생성(W01-UII) — 참고 사진 올리기 → 번호로 생성 → 결과 사본 표시. 어디서 끝나든 다시 보내지 않는다 ──
  const handleGenerateWithAssets = async (configToSubmit: InfluencerConfig) => {
    const session = sessionRef.current;
    if (!session) {
      setResult((prev) => ({ ...prev, loading: false, error: CLIENT_MESSAGES.MODE_MISMATCH }));
      return;
    }
    if (session.busy) return;   // 이미 진행 중 — 두 번 보내지 않는다

    setResult((prev) => ({ ...prev, loading: true, error: null, imageUrl: null, captions: [], assetNotice: null, assetId: null, needsReload: false, reloadMessage: null, fileExt: undefined }));
    const view = await session.generate(configToSubmit as unknown as Record<string, unknown>);

    if (view.kind === "busy") return;
    if (view.kind === "stale") {
      // 화면을 떠났거나 계정이 바뀐 경우에는 화면 상태를 건드리지 않는다. 사진이 바뀌어 취소된 경우만 안내한다
      if (!view.disposed) setResult((prev) => ({ ...prev, loading: false, error: SESSION_MESSAGES.PHOTOS_CHANGED }));
      return;
    }
    if (view.kind === "error" || view.kind === "mode_mismatch" || view.kind === "checking" || view.kind === "gone") {
      if (view.kind === "error" && view.needApiKey) setIsApiKeyModalOpen(true);
      setResult((prev) => ({ ...prev, loading: false, error: view.message }));
      alert(view.message);
      return;
    }
    if (view.kind === "omitted") {
      // 생성은 됐지만 응답에 이미지가 없다. 번호가 있으면 [다시 불러오기]만 보여 준다(스스로 조회하지 않는다)
      setResult((prev) => ({ ...prev, loading: false, error: view.message, assetId: view.assetId, needsReload: !!view.assetId, reloadMessage: null }));
      alert(view.message);
      return;
    }

    // 여기부터는 생성이 끝난 경우다: shown(사본 있음) · pending(저장됐지만 사본 없음) · inline(저장 불명·안 됨 — 응답에 실린 이미지)
    // 캡션: 기존과 같은 호출. 캡션은 사진을 쓰지 않으므로 글자 설정만 보낸다
    let generatedCaptions: string[] = [];
    try {
      const capRes = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: stripPhotoFields(configToSubmit as unknown as Record<string, unknown>) }),
      });
      const capData = await capRes.json();
      if (capData.success) generatedCaptions = capData.captions;
    } catch (capErr) {
      console.warn("캡션 생성 실패:", capErr);
    }

    const imageUrl = view.kind === "shown" ? view.src : view.kind === "inline" ? view.imageUrl : null;
    const assetNotice = view.kind === "shown" ? assetSaveNotice({ assetSaved: true }) : view.kind === "inline" ? assetSaveNotice({ assetSaved: view.assetSaved }) : null;
    setResult({
      imageUrl,
      captions: generatedCaptions,
      loading: false,
      error: null,
      assetId: view.assetId,
      needsReload: view.kind === "pending",
      reloadMessage: view.kind === "pending" ? view.message : null,
      ...(view.kind === "shown" ? { fileExt: view.fileExt } : {}),
      ...(assetNotice ? { assetNotice } : {}),
    });
    // 직전 결과 칸: 응답에 실린 이미지(data URL)는 기존처럼 둔다. 메모리 사본(blob:)은 설정에 넣지 않는다 — 보정 때 세션에서 꺼낸다
    setConfig((prev) => ({ ...prev, lastResultImage: view.kind === "inline" ? view.imageUrl : undefined, feedback: undefined }));
    // 히스토리: 화면에 이미지가 있을 때만 기존과 같은 호출로 저장한다(축소본). 사본이 없으면 저장하지 않는다
    if (imageUrl) saveToHistory(imageUrl, generatedCaptions, configToSubmit);
  };

  // [다시 불러오기] — 누를 때마다 조회 한 번. 스스로 되풀이하지 않는다
  const handleReloadAsset = async () => {
    const session = sessionRef.current;
    if (!session || isReloadingAsset) return;
    setIsReloadingAsset(true);
    const view = await session.reload();
    if (view.kind === "stale" && view.disposed) return;
    setIsReloadingAsset(false);
    if (view.kind === "shown") {
      setResult((prev) => ({ ...prev, imageUrl: view.src, fileExt: view.fileExt, needsReload: false, reloadMessage: null, error: null, assetNotice: assetSaveNotice({ assetSaved: true }) }));
    } else if (view.kind === "pending" || view.kind === "checking" || view.kind === "mode_mismatch") {
      setResult((prev) => ({ ...prev, reloadMessage: view.message }));
    } else if (view.kind === "gone") {
      setResult((prev) => ({ ...prev, needsReload: false, reloadMessage: null, error: view.message }));
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
          setConfig={assetFlow ? setConfigGuarded : setConfig}
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
          onReloadAsset={assetFlow ? handleReloadAsset : undefined}
          isReloadingAsset={isReloadingAsset}
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
