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
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  GENDERS,
  ETHNICITIES,
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
import type { InfluencerConfig, TimelineScenario } from "@/types/influencer";

interface ControlPanelProps {
  config: InfluencerConfig;
  setConfig: React.Dispatch<React.SetStateAction<InfluencerConfig>>;
  onGenerate: () => void;
  isLoading: boolean;
}

export function ControlPanel({
  config,
  setConfig,
  onGenerate,
  isLoading,
}: ControlPanelProps) {
  // 섹션 아코디언 접기/펼치기 상태
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    appearance: true,
    routine: true,
    adMode: false,
    reference: false,
    styling: true,
    cameraSkin: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 일과 플래닝 상태
  const [routineInput, setRoutineInput] = useState("");
  const [eventInput, setEventInput] = useState("");
  const [isPlanningRoutine, setIsPlanningRoutine] = useState(false);
  const [isPlanningEvent, setIsPlanningEvent] = useState(false);
  const [timelineScenarios, setTimelineScenarios] = useState<TimelineScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

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
      const persona = `${config.age}-year-old ${config.ethnicity} ${config.gender}`;
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
      alert("플래닝 요청 중 오류가 발생했습니다: " + err.message);
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
      const persona = `${config.age}-year-old ${config.ethnicity} ${config.gender}`;
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

  return (
    <aside className="w-full lg:w-[480px] xl:w-[520px] bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-61px)] shrink-0 overflow-hidden">
      {/* 스크롤 가능한 본문 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* [섹션 1] 기본 외형 설정 */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            onClick={() => toggleSection("appearance")}
            className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-pink-500" />
              <span>1. 기본 외형 설정 (Character Profile)</span>
            </div>
            {openSections.appearance ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.appearance && (
            <div className="p-4 space-y-3.5 text-xs">
              {/* 성별 & 나이 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    성별
                  </label>
                  <select
                    value={config.gender}
                    onChange={(e) => setConfig({ ...config, gender: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                  >
                    {GENDERS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.labelKo} ({g.labelEn})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    나이 ({config.age}세)
                  </label>
                  <input
                    type="range"
                    min="18"
                    max="45"
                    value={config.age}
                    onChange={(e) => setConfig({ ...config, age: e.target.value })}
                    className="w-full accent-pink-500 cursor-pointer mt-1"
                  />
                </div>
              </div>

              {/* 국적 / 인종 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  국적 / 인종 (30종)
                </label>
                <select
                  value={config.ethnicity}
                  onChange={(e) => setConfig({ ...config, ethnicity: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                >
                  {ETHNICITIES.map((eth) => (
                    <option key={eth.id} value={eth.id}>
                      {eth.labelKo} ({eth.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* 얼굴형 / 분위기 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  얼굴형 / 분위기 (30종)
                </label>
                <select
                  value={config.faceStyle}
                  onChange={(e) => setConfig({ ...config, faceStyle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                >
                  {FACE_STYLES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.labelKo} ({f.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* 헤어스타일 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  헤어스타일 (31종)
                </label>
                <select
                  value={config.hairStyle}
                  onChange={(e) => setConfig({ ...config, hairStyle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                >
                  {HAIR_STYLES.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.labelKo} ({h.labelEn})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* [섹션 2] 인플루언서의 하루 AI 플래닝 & 변형 (PRO 핵심 기능) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            onClick={() => toggleSection("routine")}
            className="w-full px-4 py-3 bg-gradient-to-r from-pink-50/70 to-rose-50/70 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-pink-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-600" />
              <span>2. 인플루언서의 하루 AI 플래닝 (PRO)</span>
            </div>
            {openSections.routine ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.routine && (
            <div className="p-4 space-y-4 text-xs">
              {/* 하루 일과 입력 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700">
                    오늘 하루 일정 입력 (5개 타임라인 자동 기획)
                  </label>
                  <button
                    onClick={handleRandomRoutine}
                    disabled={isPlanningRoutine}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600 hover:text-pink-700 hover:underline transition-all"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>🎲 랜덤 일과</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: 오늘 친구랑 성수동 카페 갔다가 저녁에 한강 러닝 뛸거야"
                    value={routineInput}
                    onChange={(e) => setRoutineInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePlanDay()}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                  />
                  <button
                    onClick={() => handlePlanDay()}
                    disabled={isPlanningRoutine || !routineInput.trim()}
                    className="px-3.5 py-2 rounded-lg bg-pink-500 text-white font-semibold hover:bg-pink-600 disabled:opacity-50 transition-colors flex items-center gap-1 text-xs shrink-0"
                  >
                    {isPlanningRoutine ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>플래닝</span>
                  </button>
                </div>
              </div>

              {/* 단일 이벤트 5각 변형 */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-700">
                  단일 이벤트 변형 (Event Variations)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: 브랜드 런칭 파티, 제주도 풀빌라 호캉스..."
                    value={eventInput}
                    onChange={(e) => setEventInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePlanEvent()}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                  />
                  <button
                    onClick={handlePlanEvent}
                    disabled={isPlanningEvent || !eventInput.trim()}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-900 disabled:opacity-50 transition-colors flex items-center gap-1 text-xs shrink-0"
                  >
                    {isPlanningEvent ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Layers className="w-3.5 h-3.5" />
                    )}
                    <span>변형 설계</span>
                  </button>
                </div>
              </div>

              {/* 생성된 타임라인 시나리오 목록 */}
              {timelineScenarios.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-pink-500" />
                    기획된 5대 시나리오 (클릭 시 옵션 즉시 반영)
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {timelineScenarios.map((sc) => {
                      const isSelected = selectedScenarioId === sc.id;
                      return (
                        <div
                          key={sc.id}
                          onClick={() => applyScenario(sc)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? "bg-pink-50/80 border-pink-400 ring-1 ring-pink-400"
                              : "bg-white border-slate-200 hover:border-pink-200 hover:bg-slate-50/60"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                              isSelected
                                ? "bg-pink-500 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {sc.timeOrder}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 truncate">
                                {sc.labelKo}
                              </span>
                              <span className="text-[10px] text-slate-400">{sc.labelEn}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {sc.story}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* [섹션 3] 광고 / 공구 모드 (Ad Mode) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
            <button
              onClick={() => toggleSection("adMode")}
              className="flex items-center gap-2 text-left text-xs font-bold text-slate-800"
            >
              <ShoppingBag className="w-4 h-4 text-pink-500" />
              <span>3. 광고 / 공구 모드 (Ad Mode)</span>
            </button>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isAdMode || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setConfig((prev) => ({ ...prev, isAdMode: checked }));
                    if (checked && !openSections.adMode) {
                      setOpenSections((prev) => ({ ...prev, adMode: true }));
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
              <button onClick={() => toggleSection("adMode")}>
                {openSections.adMode ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {openSections.adMode && (
            <div className="p-4 space-y-3.5 text-xs bg-pink-50/20">
              {/* 광고 유형 선택 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  광고 유형 (Ad Type)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {AD_TYPES.map((ad) => {
                    const isSelected = config.adType === ad.id;
                    return (
                      <button
                        key={ad.id}
                        type="button"
                        onClick={() => setConfig({ ...config, adType: ad.id })}
                        className={`px-2 py-1.5 rounded-lg border text-left text-[11px] transition-all ${
                          isSelected
                            ? "bg-pink-500 text-white border-pink-500 font-semibold shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                        title={ad.description}
                      >
                        {ad.labelKo}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 상품명 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  상품명 (Product Name)
                </label>
                <input
                  type="text"
                  placeholder="예: 루미너스 앰플, 다이어트 단백질 쉐이크..."
                  value={config.productName || ""}
                  onChange={(e) => setConfig({ ...config, productName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              {/* 제품 사진 업로드 (최대 3장) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-700">
                    제품 사진 업로드 (최대 3장)
                  </label>
                  <span className="text-[10px] text-slate-400">
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
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {(config.productImages?.length || 0) < 3 && (
                    <label className="w-16 h-16 rounded-lg border border-dashed border-pink-300 bg-pink-50/50 hover:bg-pink-50 flex flex-col items-center justify-center cursor-pointer transition-colors text-pink-600">
                      <Upload className="w-4 h-4 mb-0.5" />
                      <span className="text-[10px] font-medium">+ 추가</span>
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

        {/* [섹션 4] 일관성 유지 (레퍼런스 이미지) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            onClick={() => toggleSection("reference")}
            className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-pink-500" />
              <span>4. 일관성 유지 (인물 & 장소 레퍼런스)</span>
            </div>
            {openSections.reference ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.reference && (
            <div className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* 인물 고정 사진 */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    인물 고정 (얼굴 일관성)
                  </label>
                  {config.personImage ? (
                    <div className="w-full h-28 rounded-lg border border-slate-200 overflow-hidden relative group">
                      <img
                        src={config.personImage}
                        alt="인물 고정"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setConfig({ ...config, personImage: undefined })}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-28 rounded-lg border-2 border-dashed border-slate-200 hover:border-pink-300 hover:bg-pink-50/20 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400">
                      <Upload className="w-5 h-5 mb-1 text-slate-400" />
                      <span className="text-[11px] font-medium text-slate-600">얼굴 사진 업로드</span>
                      <span className="text-[10px] text-slate-400">정면 고해상도 권장</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "personImage")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 장소 고정 사진 */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    장소 고정 (배경 일관성)
                  </label>
                  {config.placeImage ? (
                    <div className="w-full h-28 rounded-lg border border-slate-200 overflow-hidden relative group">
                      <img
                        src={config.placeImage}
                        alt="장소 고정"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setConfig({ ...config, placeImage: undefined })}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-28 rounded-lg border-2 border-dashed border-slate-200 hover:border-pink-300 hover:bg-pink-50/20 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400">
                      <Upload className="w-5 h-5 mb-1 text-slate-400" />
                      <span className="text-[11px] font-medium text-slate-600">배경 사진 업로드</span>
                      <span className="text-[10px] text-slate-400">카페, 침실, 스튜디오</span>
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
          )}
        </div>

        {/* [섹션 5] 스타일링 (표정, 포즈, 의상, 장소) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            onClick={() => toggleSection("styling")}
            className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-pink-500" />
              <span>5. 표정 & 포즈 & 의상 & 장소</span>
            </div>
            {openSections.styling ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.styling && (
            <div className="p-4 space-y-3.5 text-xs">
              {/* 표정 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  표정 (30종)
                </label>
                <div className="flex gap-2">
                  <select
                    value={config.expression}
                    onChange={(e) => setConfig({ ...config, expression: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                  >
                    {EXPRESSIONS.map((ex) => (
                      <option key={ex.id} value={ex.detail}>
                        {ex.labelKo} ({ex.labelEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 포즈 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  포즈 (30종 - 셀카 특화)
                </label>
                <select
                  value={config.pose}
                  onChange={(e) => setConfig({ ...config, pose: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                >
                  {POSES.map((p) => (
                    <option key={p.id} value={p.detail}>
                      {p.labelKo} ({p.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* 의상 프리셋 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  의상 프리셋 (5대 카테고리 51종)
                </label>
                <select
                  onChange={(e) => setConfig({ ...config, outfit: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium mb-1.5"
                >
                  <option value="">의상 프리셋 선택...</option>
                  {OUTFIT_CATEGORIES.map((cat) => (
                    <optgroup key={cat.category} label={cat.category}>
                      {cat.options.map((opt) => (
                        <option key={opt.id} value={opt.detail}>
                          {opt.labelKo} ({opt.labelEn})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="의상 직접 상세 입력..."
                  value={config.outfit}
                  onChange={(e) => setConfig({ ...config, outfit: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              {/* 장소 / 배경 프리셋 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  장소 / 배경 프리셋 (30종)
                </label>
                <select
                  onChange={(e) => setConfig({ ...config, location: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium mb-1.5"
                >
                  <option value="">장소 프리셋 선택...</option>
                  {LOCATION_CATEGORIES.map((cat) => (
                    <optgroup key={cat.category} label={cat.category}>
                      {cat.options.map((opt) => (
                        <option key={opt.id} value={opt.detail}>
                          {opt.labelKo} ({opt.labelEn})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="장소 직접 상세 입력..."
                  value={config.location}
                  onChange={(e) => setConfig({ ...config, location: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* [섹션 6] 조명, 카메라, 피부 텍스처, 출력 설정 */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            onClick={() => toggleSection("cameraSkin")}
            className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-pink-500" />
              <span>6. 촬영 환경 & 피부 디테일 & 출력 설정</span>
            </div>
            {openSections.cameraSkin ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.cameraSkin && (
            <div className="p-4 space-y-3.5 text-xs">
              {/* 조명 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  조명 및 분위기 (18종)
                </label>
                <select
                  value={config.lighting}
                  onChange={(e) => setConfig({ ...config, lighting: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                >
                  {LIGHTINGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.labelKo} ({l.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* 카메라 모드 (셀카 vs 3인칭 화보) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  촬영 기기 & 앵글 (11종)
                </label>
                <select
                  value={config.camera}
                  onChange={(e) => setConfig({ ...config, camera: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                >
                  {CAMERA_MODES.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.labelKo} ({opt.labelEn})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* 필름 스톡 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  필름 스톡 및 톤 (11종)
                </label>
                <select
                  value={config.filmStock}
                  onChange={(e) => setConfig({ ...config, filmStock: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                >
                  {FILM_STOCKS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.labelKo} ({f.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* 피부 텍스처 (30종 멀티 선택) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-700">
                    피부 텍스처 디테일 (멀티 선택)
                  </label>
                  <span className="text-[10px] text-pink-600 font-medium">
                    {config.skin?.length || 0}개 선택됨
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  {SKIN_TEXTURES.map((st) => {
                    const isChecked = config.skin?.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleSkinTexture(st.id)}
                        className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                          isChecked
                            ? "bg-pink-500 text-white font-semibold shadow-2xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {st.labelKo}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 화면 비율 & 화질 */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    화면 비율
                  </label>
                  <select
                    value={config.aspectRatio}
                    onChange={(e) => setConfig({ ...config, aspectRatio: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    {ASPECT_RATIO_OPTIONS.map((ar) => (
                      <option key={ar.id} value={ar.id}>
                        {ar.labelKo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    화질 (해상도)
                  </label>
                  <select
                    value={config.quality}
                    onChange={(e) => setConfig({ ...config, quality: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    {QUALITY_OPTIONS.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.labelKo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 고정 생성 버튼 */}
      <div className="p-4 border-t border-slate-200 bg-white/95 backdrop-blur-xs shrink-0 shadow-lg">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 shadow-md shadow-pink-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI 인플루언서 화보 렌더링 중...</span>
            </>
          ) : config.isAdMode ? (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>🛍️ 광고 / 공구 화보 생성</span>
            </>
          ) : config.personImage ? (
            <>
              <User className="w-4 h-4" />
              <span>👤 인물 고정 화보 생성</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>🚀 AI 인플루언서 화보 생성</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
