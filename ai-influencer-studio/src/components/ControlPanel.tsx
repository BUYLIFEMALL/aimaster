"use client";

import { useState } from "react";
import {
  User,
  Sparkles,
  Dices,
  ShoppingBag,
  Camera,
  Layers,
  Sliders,
  Upload,
  X,
  Send,
  Check,
  Loader2,
  ExternalLink,
  Shirt,
  Sun,
  Smile,
  Shield,
  Palette,
  HelpCircle,
  Settings,
} from "lucide-react";
import {
  GENDERS,
  ETHNICITIES,
  AGES,
  HAIR_STYLES,
  FACE_STYLES,
  EXPRESSIONS,
  POSES,
  OUTFIT_CATEGORIES,
  LOCATION_CATEGORIES,
  LIGHTINGS,
  CAMERA_MODES,
  FILM_STOCKS,
  SKIN_TEXTURES,
  AD_TYPES,
  RANDOM_ROUTINE_PRESETS,
  QUALITY_OPTIONS,
  ASPECT_RATIO_OPTIONS,
} from "@/data/influencer-options";
import { APP_VERSION } from "@/lib/version";
import type { InfluencerConfig, TimelineScenario } from "@/types/influencer";

interface ControlPanelProps {
  config: InfluencerConfig;
  setConfig: React.Dispatch<React.SetStateAction<InfluencerConfig>>;
  onGenerate: () => void;
  isLoading: boolean;
  onOpenApiKeyModal: () => void;
  onOpenHelpModal: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  hasApiKey: boolean;
}

export function ControlPanel({
  config,
  setConfig,
  onGenerate,
  isLoading,
  onOpenApiKeyModal,
  onOpenHelpModal,
  onOpenHistory,
  historyCount,
  hasApiKey,
}: ControlPanelProps) {
  // 일과 플래닝 상태
  const [routineInput, setRoutineInput] = useState("");
  const [eventInput, setEventInput] = useState("");
  const [isPlanningRoutine, setIsPlanningRoutine] = useState(false);
  const [isPlanningEvent, setIsPlanningEvent] = useState(false);
  const [timelineScenarios, setTimelineScenarios] = useState<TimelineScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isRandomRolling, setIsRandomRolling] = useState(false);

  // 전체 옵션 랜덤 믹스 (주사위 버튼 클릭 시 실행)
  const handleRandomize = () => {
    setSelectedScenarioId(null);
    setIsRandomRolling(true);
    setTimeout(() => setIsRandomRolling(false), 500);

    try {
      const pickRandom = <T,>(arr: T[]): T | null =>
        !arr || arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)];

      const allOutfits = OUTFIT_CATEGORIES.flatMap((c) => c.options);
      const allLocations = LOCATION_CATEGORIES.flatMap((c) => c.options);
      const allCameras = CAMERA_MODES.flatMap((c) => c.options);

      const randomGender = pickRandom(GENDERS);
      const randomEthnicity = pickRandom(ETHNICITIES);
      const randomAge = pickRandom(AGES);
      const randomHair = pickRandom(HAIR_STYLES);
      const randomFace = pickRandom(FACE_STYLES);
      const randomExpression = pickRandom(EXPRESSIONS);
      const randomPose = pickRandom(POSES);
      const randomOutfit = pickRandom(allOutfits);
      const randomLocation = pickRandom(allLocations);
      const randomLighting = pickRandom(LIGHTINGS);
      const randomCamera = pickRandom(allCameras);
      const randomFilm = pickRandom(FILM_STOCKS);

      // 피부 질감 1~2개 무작위 선택
      const randomSkin1 = pickRandom(SKIN_TEXTURES);
      const randomSkin2 = pickRandom(SKIN_TEXTURES);
      const skinList = [randomSkin1?.id, randomSkin2?.id].filter(
        (id, idx, arr): id is string => Boolean(id) && arr.indexOf(id) === idx
      );

      const randomAspect = pickRandom(ASPECT_RATIO_OPTIONS);

      setConfig((prev) => ({
        ...prev,
        gender: randomGender?.id || "female",
        ethnicity: randomEthnicity?.id || "kr",
        age: randomAge?.id || "24",
        hairStyle: randomHair?.id || "l_str_b",
        faceStyle: randomFace?.id || "elegant",
        expression: randomExpression?.detail || "soft gentle smile",
        pose: randomPose?.detail || "natural portrait selfie pose",
        outfit: randomOutfit?.detail || "oversized white crisp button-up shirt",
        location: randomLocation?.detail || "cozy sunlight-filled cafe",
        lighting: randomLighting?.id || "m_win",
        camera: randomCamera?.id || "iphone_rear",
        filmStock: randomFilm?.id || "p_400",
        skin: skinList,
        aspectRatio: randomAspect?.id || prev.aspectRatio,
        storyContext: undefined,
        isAdMode: false,
      }));
    } catch (err) {
      console.error("랜덤 설정 실패:", err);
    }
  };

  // 파일 업로드 헬퍼 (Base64 변환)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "personImage" | "placeImage" | "productImages"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (field === "productImages") {
      const remainingSlots = 3 - (config.productImages?.length || 0);
      const toUpload = Array.from(files).slice(0, remainingSlots);
      toUpload.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setConfig((prev) => ({
              ...prev,
              productImages: [...(prev.productImages || []), reader.result as string],
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setConfig((prev) => ({ ...prev, [field]: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 피부 질감 멀티 토글
  const toggleSkinTexture = (textureId: string) => {
    setConfig((prev) => {
      const current = prev.skin || [];
      const updated = current.includes(textureId)
        ? current.filter((id) => id !== textureId)
        : [...current, textureId];
      return { ...prev, skin: updated };
    });
  };

  // AI 일과 플래닝 호출
  const handlePlanDay = async (promptToUse?: string) => {
    const prompt = promptToUse || routineInput;
    if (!prompt.trim()) return;

    setIsPlanningRoutine(true);
    try {
      const persona = `${config.age || "24"}-year-old ${config.ethnicity || "kr"} ${config.gender || "female"}`;
      const res = await fetch("/api/plan-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routinePrompt: prompt, persona }),
      });
      const data = await res.json();
      if (data.success && data.scenarios) {
        setTimelineScenarios(data.scenarios);
        if (data.scenarios.length > 0) {
          applyScenario(data.scenarios[0]);
        }
      } else {
        alert(data.error || "일과 플래닝 실패");
      }
    } catch (err: any) {
      alert("플래닝 요청 중 오류 발생: " + err.message);
    } finally {
      setIsPlanningRoutine(false);
    }
  };

  // 랜덤 일과 주사위 호출
  const handleRandomRoutine = () => {
    const randomPreset =
      RANDOM_ROUTINE_PRESETS[Math.floor(Math.random() * RANDOM_ROUTINE_PRESETS.length)];
    setRoutineInput(randomPreset);
    handlePlanDay(randomPreset);
  };

  // 단일 이벤트 5각 변형 호출
  const handlePlanEvent = async () => {
    if (!eventInput.trim()) return;

    setIsPlanningEvent(true);
    try {
      const persona = `${config.age || "24"}-year-old ${config.ethnicity || "kr"} ${config.gender || "female"}`;
      const res = await fetch("/api/plan-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventPrompt: eventInput, persona }),
      });
      const data = await res.json();
      if (data.success && data.scenarios) {
        setTimelineScenarios(data.scenarios);
        if (data.scenarios.length > 0) {
          applyScenario(data.scenarios[0]);
        }
      } else {
        alert(data.error || "이벤트 변형 생성 실패");
      }
    } catch (err: any) {
      alert("이벤트 변형 요청 중 오류: " + err.message);
    } finally {
      setIsPlanningEvent(false);
    }
  };

  // 시나리오 클릭 시 원클릭 옵션 적용
  const applyScenario = (sc: TimelineScenario) => {
    setSelectedScenarioId(sc.id);
    setConfig((prev) => ({
      ...prev,
      outfit: sc.config.outfit || prev.outfit,
      location: sc.config.location || prev.location,
      expression: sc.config.expression || prev.expression,
      pose: sc.config.pose || prev.pose,
      lighting: sc.config.lighting || prev.lighting,
      camera: sc.config.camera || prev.camera,
      hairStyle: sc.config.hairStyle || prev.hairStyle,
      faceStyle: sc.config.faceStyle || prev.faceStyle,
      filmStock: sc.config.filmStock || prev.filmStock,
      skin: sc.config.skin?.length ? sc.config.skin : prev.skin,
      storyContext: sc.story || prev.storyContext,
    }));
  };

  const selectedAdType = AD_TYPES.find((a) => a.id === config.adType) || AD_TYPES[0];

  return (
    <aside className="w-full lg:w-[460px] xl:w-[490px] bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 overflow-hidden shadow-sm">
      {/* 1. 상단 브랜드 헤더 (스크린샷 규격 1:1) */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>PureGlow Pro</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600 border border-pink-200">
              {APP_VERSION}
            </span>
          </h2>
          <p className="text-[10px] font-bold text-pink-500 tracking-widest uppercase mt-0.5">
            AI INFLUENCER STORY ENGINE
          </p>
        </div>

        {/* 우측 툴바 아이콘 도구 (스크린샷 규격 1:1 매칭: 가이드 / 설정 / 주사위 랜덤 믹스 / 히스토리) */}
        <div className="flex items-center gap-1.5">
          {/* 1. 가이드 (물음표) */}
          <button
            onClick={onOpenHelpModal}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="사용 가이드"
          >
            <HelpCircle className="w-4 h-4 text-slate-600 hover:text-pink-600" />
          </button>

          {/* 2. API 키 / 환경 설정 (톱니바퀴) */}
          <button
            onClick={onOpenApiKeyModal}
            className={`p-2 rounded-lg border transition-all ${
              hasApiKey
                ? "text-slate-700 border-slate-200 bg-slate-50 hover:bg-slate-100"
                : "text-rose-600 border-rose-300 bg-rose-50 hover:bg-rose-100 animate-pulse"
            }`}
            title="Gemini API 키 및 설정"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 3. 랜덤 설정값 옵션 (주사위: 누를 때마다 전체 옵션 랜덤 믹스) */}
          <button
            onClick={handleRandomize}
            className={`p-2 rounded-lg border transition-all ${
              isRandomRolling
                ? "border-pink-400 bg-pink-100 text-pink-700 scale-105 shadow-sm"
                : "border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50/50 text-slate-700 hover:text-pink-600 shadow-xs"
            }`}
            title="랜덤 설정값 옵션 (클릭 시 전체 설정 랜덤 믹스)"
          >
            <Dices
              className={`w-4 h-4 transition-transform duration-500 ${
                isRandomRolling ? "rotate-180 scale-110 text-pink-600" : ""
              }`}
            />
          </button>

          {/* 4. 작업 히스토리 */}
          <button
            onClick={onOpenHistory}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            title="작업 히스토리"
          >
            <Sliders className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500"></span>
            )}
          </button>
        </div>
      </div>

      {/* 2. 전체 옵션 세로 스크롤 영역 (스크린샷 규격과 동일) */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 text-xs text-slate-700">
        {/* [섹션 1] 기본 외형 설정 (2x2 그리드) */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600">
            <User className="w-3.5 h-3.5" />
            <span>기본 외형 설정</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 성별 */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                성별
              </label>
              <select
                value={config.gender || ""}
                onChange={(e) => setConfig({ ...config, gender: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">성별 선택...</option>
                {GENDERS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.labelKo}
                  </option>
                ))}
              </select>
            </div>

            {/* 국적 */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                국적
              </label>
              <select
                value={config.ethnicity || ""}
                onChange={(e) => setConfig({ ...config, ethnicity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">국적 선택...</option>
                {ETHNICITIES.map((eth) => (
                  <option key={eth.id} value={eth.id}>
                    {eth.labelKo}
                  </option>
                ))}
              </select>
            </div>

            {/* 나이 (드롭다운) */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                나이
              </label>
              <select
                value={config.age || ""}
                onChange={(e) => setConfig({ ...config, age: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">나이 선택...</option>
                {AGES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.labelKo}
                  </option>
                ))}
              </select>
            </div>

            {/* 헤어스타일 */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                헤어스타일
              </label>
              <select
                value={config.hairStyle || ""}
                onChange={(e) => setConfig({ ...config, hairStyle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">헤어스타일 선택...</option>
                {HAIR_STYLES.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.labelKo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* [섹션 2] 인플루언서의 하루 (AI 플래닝) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>인플루언서의 하루 (AI 플래닝)</span>
            </span>
            <button
              type="button"
              onClick={handleRandomRoutine}
              disabled={isPlanningRoutine}
              className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-md text-slate-600 border border-slate-200 transition-colors flex items-center gap-1 font-semibold"
            >
              <Dices className={`w-3 h-3 ${isPlanningRoutine ? "animate-spin" : ""}`} />
              <span>랜덤 일과</span>
            </button>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="(자동 생성된 테마) K-POP 아이돌 연습생의 하루"
              value={routineInput}
              onChange={(e) => setRoutineInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePlanDay()}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-10 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white outline-hidden transition-all placeholder:text-slate-400"
            />
            <button
              onClick={() => handlePlanDay()}
              disabled={isPlanningRoutine || !routineInput.trim()}
              className="absolute right-1.5 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              title="플래닝 실행"
            >
              {isPlanningRoutine ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* 기획된 5대 시나리오 칩 */}
          {timelineScenarios.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 block">
                기획된 5대 장면 (클릭 시 옵션 자동 세팅)
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {timelineScenarios.map((sc) => {
                  const isSelected = selectedScenarioId === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => applyScenario(sc)}
                      className={`w-full text-left p-2 rounded-lg border text-[11px] transition-all flex items-center gap-2 ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-bold"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                        {sc.timeOrder}
                      </span>
                      <span className="truncate flex-1">{sc.labelKo}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{sc.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* [섹션 3] 단일 이벤트 변형 (EVENT VARIATIONS) */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-pink-600 uppercase tracking-wider block">
            단일 이벤트 변형 (EVENT VARIATIONS)
          </span>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="예: 한강 피크닉, 브랜드 런칭 파티..."
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePlanEvent()}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-10 text-xs text-slate-900 focus:border-pink-500 focus:bg-white outline-hidden transition-all placeholder:text-slate-400"
            />
            <button
              onClick={() => handlePlanEvent()}
              disabled={isPlanningEvent || !eventInput.trim()}
              className="absolute right-1.5 p-1.5 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-40 transition-colors"
              title="변형 설계 실행"
            >
              {isPlanningEvent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* [섹션 4] 광고/공구 모드 (AD MODE) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                config.isAdMode ? "text-amber-600" : "text-slate-500"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>광고/공구 모드 (AD MODE)</span>
            </span>

            {/* 골드/주황 사각 토글 */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, isAdMode: !config.isAdMode })}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                config.isAdMode
                  ? "bg-amber-500 border-amber-500 text-white shadow-2xs"
                  : "border-slate-300 bg-white"
              }`}
            >
              {config.isAdMode && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          </div>

          {config.isAdMode && (
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3 animate-in fade-in duration-200">
              {/* 광고 유형 5개 세로 목록 버튼 */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">
                  광고 유형 (AD TYPE)
                </label>
                <div className="space-y-1">
                  {AD_TYPES.map((ad) => {
                    const isSelected = config.adType === ad.id;
                    return (
                      <button
                        key={ad.id}
                        type="button"
                        onClick={() => setConfig({ ...config, adType: ad.id })}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-white border-amber-400 text-amber-900 shadow-2xs ring-1 ring-amber-400"
                            : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white"
                        }`}
                      >
                        <span>{ad.labelKo}</span>
                        {isSelected && (
                          <ExternalLink className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 선택된 광고 유형 설명 카드 */}
              {selectedAdType && (
                <div className="p-2.5 rounded-lg bg-amber-100/60 border border-amber-200/80 text-[11px] text-amber-900/90 leading-relaxed flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold shrink-0 mt-0.5">💡</span>
                  <span>{selectedAdType.description}</span>
                </div>
              )}

              {/* 상품명 */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">
                  상품명 (PRODUCT NAME)
                </label>
                <input
                  type="text"
                  placeholder="예: 루미너스 앰플, 다이어트 쉐이크..."
                  value={config.productName || ""}
                  onChange={(e) => setConfig({ ...config, productName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* 상품 사진 (최대 3장) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">상품 사진 (최대 3장)</span>
                  <span className="text-amber-700 font-semibold">
                    {config.productImages?.length || 0} / 3장
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {config.productImages?.map((img, idx) => (
                    <div
                      key={idx}
                      className="w-16 h-16 rounded-lg border border-slate-200 bg-white overflow-hidden relative group"
                    >
                      <img src={img} alt="제품" className="w-full h-full object-cover" />
                      <button
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            productImages: prev.productImages?.filter((_, i) => i !== idx),
                          }))
                        }
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {(config.productImages?.length || 0) < 3 && (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-amber-300 bg-white hover:bg-amber-50 flex flex-col items-center justify-center cursor-pointer transition-colors text-amber-600">
                      <Upload className="w-4 h-4 mb-0.5" />
                      <span className="text-[10px] font-bold">+ 추가</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileUpload(e, "productImages")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* [섹션 5] 일관성 유지 (레퍼런스 이미지) */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600">
            <Camera className="w-3.5 h-3.5" />
            <span>일관성 유지 (레퍼런스 이미지)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 인물 고정 */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                인물 고정
              </span>
              {config.personImage ? (
                <div className="w-full aspect-square rounded-xl border border-slate-200 overflow-hidden relative group">
                  <img
                    src={config.personImage}
                    alt="인물 고정"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setConfig({ ...config, personImage: undefined })}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-pink-300 bg-slate-50 hover:bg-pink-50/20 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400">
                  <User className="w-6 h-6 mb-1 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-600">사진 업로드</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "personImage")}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 장소 고정 */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                장소 고정
              </span>
              {config.placeImage ? (
                <div className="w-full aspect-square rounded-xl border border-slate-200 overflow-hidden relative group">
                  <img
                    src={config.placeImage}
                    alt="장소 고정"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setConfig({ ...config, placeImage: undefined })}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-pink-300 bg-slate-50 hover:bg-pink-50/20 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400">
                  <Camera className="w-6 h-6 mb-1 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-600">장소 업로드</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "placeImage")}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* [섹션 6] 표정 및 포즈 (셀카 특화) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600">
            <Smile className="w-3.5 h-3.5" />
            <span>표정 및 포즈 (셀카 특화)</span>
          </div>

          {/* 1행: 드롭다운 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                표정
              </label>
              <select
                value={
                  EXPRESSIONS.find((e) => e.detail === config.expression)?.id || ""
                }
                onChange={(e) => {
                  const opt = EXPRESSIONS.find((item) => item.id === e.target.value);
                  setConfig({ ...config, expression: opt ? opt.detail : "" });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium"
              >
                <option value="">표정 선택...</option>
                {EXPRESSIONS.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.labelKo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                포즈
              </label>
              <select
                value={
                  POSES.find((p) => p.detail === config.pose)?.id || ""
                }
                onChange={(e) => {
                  const opt = POSES.find((item) => item.id === e.target.value);
                  setConfig({ ...config, pose: opt ? opt.detail : "" });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium"
              >
                <option value="">포즈 선택...</option>
                {POSES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.labelKo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2행: 직접 수정 인풋 (네온/퍼플 보더) */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="표정 직접 입력 (영문) 또는 위에서 선택"
              value={config.expression || ""}
              onChange={(e) => setConfig({ ...config, expression: e.target.value })}
              className="w-full bg-slate-50 border border-purple-300 rounded-lg p-2 text-[11px] text-purple-900 font-mono focus:bg-white focus:ring-1 focus:ring-purple-500 placeholder:text-slate-400 truncate"
            />
            <input
              type="text"
              placeholder="포즈 직접 입력 (영문) 또는 위에서 선택"
              value={config.pose || ""}
              onChange={(e) => setConfig({ ...config, pose: e.target.value })}
              className="w-full bg-slate-50 border border-purple-300 rounded-lg p-2 text-[11px] text-purple-900 font-mono focus:bg-white focus:ring-1 focus:ring-purple-500 placeholder:text-slate-400 truncate"
            />
          </div>
        </div>

        {/* [섹션 7] 의상 및 장소 */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600">
            <Shirt className="w-3.5 h-3.5" />
            <span>의상 및 장소</span>
          </div>

          {/* 1행: 드롭다운 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <select
                value={
                  OUTFIT_CATEGORIES.flatMap((c) => c.options).find((o) => o.detail === config.outfit)?.id || ""
                }
                onChange={(e) => {
                  const allOpts = OUTFIT_CATEGORIES.flatMap((c) => c.options);
                  const opt = allOpts.find((o) => o.id === e.target.value);
                  setConfig({ ...config, outfit: opt ? opt.detail : "" });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium"
              >
                <option value="">의상 선택...</option>
                {OUTFIT_CATEGORIES.map((cat) => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.labelKo}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <select
                value={
                  LOCATION_CATEGORIES.flatMap((c) => c.options).find((o) => o.detail === config.location)?.id || ""
                }
                onChange={(e) => {
                  const allOpts = LOCATION_CATEGORIES.flatMap((c) => c.options);
                  const opt = allOpts.find((o) => o.id === e.target.value);
                  setConfig({ ...config, location: opt ? opt.detail : "" });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium"
              >
                <option value="">장소 선택...</option>
                {LOCATION_CATEGORIES.map((cat) => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.labelKo}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* 2행: 직접 수정 인풋 */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="의상 직접 입력 (영문) 또는 위에서 선택"
              value={config.outfit || ""}
              onChange={(e) => setConfig({ ...config, outfit: e.target.value })}
              className="w-full bg-slate-50 border border-purple-300 rounded-lg p-2 text-[11px] text-purple-900 font-mono focus:bg-white focus:ring-1 focus:ring-purple-500 placeholder:text-slate-400 truncate"
            />
            <input
              type="text"
              placeholder="장소 직접 입력 (영문) 또는 위에서 선택"
              value={config.location || ""}
              onChange={(e) => setConfig({ ...config, location: e.target.value })}
              className="w-full bg-slate-50 border border-purple-300 rounded-lg p-2 text-[11px] text-purple-900 font-mono focus:bg-white focus:ring-1 focus:ring-purple-500 placeholder:text-slate-400 truncate"
            />
          </div>
        </div>

        {/* [섹션 8] 조명 및 카메라 촬영 */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600">
            <Sun className="w-3.5 h-3.5" />
            <span>조명 및 카메라 촬영</span>
          </div>

          {/* 1행: 조명 & 촬영 기기 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                조명
              </label>
              <select
                value={config.lighting || ""}
                onChange={(e) => setConfig({ ...config, lighting: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium"
              >
                <option value="">조명 선택...</option>
                {LIGHTINGS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.labelKo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                촬영 기기 (SELFIE 특화)
              </label>
              <select
                value={config.camera || ""}
                onChange={(e) => setConfig({ ...config, camera: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium"
              >
                <option value="">촬영 기기 선택...</option>
                {CAMERA_MODES.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.labelKo}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* 2행: 필름 스톡 (전체 너비) */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
              필름 스톡
            </label>
            <select
              value={config.filmStock || ""}
              onChange={(e) => setConfig({ ...config, filmStock: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium"
            >
              <option value="">필름 스톡 선택...</option>
              {FILM_STOCKS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.labelKo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* [섹션 9] 피부 텍스처 디테일 (2열 체크박스 그리드) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600">
            <Palette className="w-3.5 h-3.5" />
            <span>피부 텍스처 디테일</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SKIN_TEXTURES.map((st) => {
              const isChecked = config.skin?.includes(st.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => toggleSkinTexture(st.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] font-medium transition-all text-left ${
                    isChecked
                      ? "bg-pink-50 border-pink-400 text-pink-900 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/60"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? "bg-pink-500 border-pink-500 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate">{st.labelKo}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* [섹션 10] 출력 설정 */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-pink-600 uppercase tracking-wider block">
            출력 설정
          </span>

          {/* 화면비 (4분할 버튼) */}
          <div className="grid grid-cols-4 gap-2">
            {ASPECT_RATIO_OPTIONS.map((ar) => {
              const isSelected = config.aspectRatio === ar.id;
              return (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => setConfig({ ...config, aspectRatio: ar.id })}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    isSelected
                      ? "bg-pink-500 border-pink-500 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {ar.id}
                </button>
              );
            })}
          </div>

          {/* 화질 (3분할 버튼: 1K / 2K / 4K) */}
          <div className="grid grid-cols-3 gap-2">
            {QUALITY_OPTIONS.map((q) => {
              const isSelected = config.quality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setConfig({ ...config, quality: q.id })}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {q.id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 하단 대형 생성 버튼 & 푸터 */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-2.5">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 hover:from-purple-700 hover:to-rose-600 shadow-md shadow-pink-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI 인플루언서 화보 렌더링 중...</span>
            </>
          ) : config.isAdMode ? (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>광고/공구 이미지 생성</span>
            </>
          ) : config.personImage ? (
            <>
              <User className="w-4 h-4" />
              <span>인물 고정 이미지 생성</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>이미지 생성</span>
            </>
          )}
        </button>

        {/* 푸터 (스크린샷 규격 1:1) */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <span>개발자 : GPT PARK</span>
          <a
            href="https://pure-glow-pro-99gg.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors inline-flex items-center gap-1"
          >
            <span>바로가기</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
