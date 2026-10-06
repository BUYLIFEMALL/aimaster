"use client";

import { useState, useEffect, useRef } from "react";
import {
  getSuggestedTopicsAction,
  generateThreadPlanAction,
  rewriteThreadPlanAction,
} from "@/lib/actions/planner";
import type {
  TopicSuggestion,
  ThreadPlanResult,
  HookVariant,
  RewriteMode,
  PlannerPersona,
  ThreadPlannerTemplateInput,
  SavedThreadPlan,
  MediaAttachment,
} from "@/types/planner";
import {
  REWRITE_MODES,
  PLANNER_PERSONAS,
} from "@/types/planner";
import {
  savePlanToStorage,
  loadPlanByIdFromStorage,
} from "@/lib/storage/savedPlansStorage";
import { TARGET_CATEGORIES } from "@/lib/constants/categories";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODELS,
  PROVIDER_SHORT_LABELS,
  type AIModelProvider,
} from "@/lib/ai/models";
import {
  processSingleImage,
  processMultipleImages,
  buildMediaAttachmentFromImages,
  processVideoFile,
} from "@/lib/mediaProcessor";
import {
  QUICK_MOOD_CHIPS,
  getCurrentTimeContext,
  getRandomLuckyPick,
  type QuickMoodChip,
} from "@/lib/constants/luckyTopics";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  Trash2,
  Loader2,
  Sparkles,
  CheckCircle2,
  Plus,
  X,
  Dices,
  RotateCcw,
} from "lucide-react";

export function PlannerApp() {
  // 메인 키워드 입력
  const [topicInput, setTopicInput] = useState("");
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);

  // 미디어(이미지/영상) 첨부 상태
  const [mediaAttachment, setMediaAttachment] = useState<MediaAttachment | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topicsSectionRef = useRef<HTMLDivElement>(null);

  // 실전 템플릿 필드 (선택 입력)
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateProduct, setTemplateProduct] = useState("");
  const [templateExperience, setTemplateExperience] = useState("");
  const [templateTarget, setTemplateTarget] = useState("");
  const [templateBenchmark, setTemplateBenchmark] = useState("");

  // 오늘 뭐 쓰지? 카테고리 & 10선 주제 영역
  const [showCategoryPicker, setShowCategoryPicker] = useState(true); // 기본 노출하여 바로 선택 가능!
  const [selectedCategory, setSelectedCategory] = useState<string>("tips");

  // AI 추론 엔진 및 모델 선택 상태 (OpenAI / Claude / Gemini)
  const [selectedProvider, setSelectedProvider] = useState<AIModelProvider>("openai");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4.1");
  const [missingProviderName, setMissingProviderName] = useState<string | null>(null);

  // 로딩 상태
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [activeRewriteMode, setActiveRewriteMode] = useState<RewriteMode | null>(null);
  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null);

  // 생성 데이터 결과
  const [suggestedTopics, setSuggestedTopics] = useState<TopicSuggestion[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ThreadPlanResult | null>(null);
  const [usedModelLabel, setUsedModelLabel] = useState<string | null>(null);
  const [usedPersonaLabel, setUsedPersonaLabel] = useState<string | null>(null);
  const [expandedHookIdx, setExpandedHookIdx] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [needApiKeyModal, setNeedApiKeyModal] = useState(false);

  // 보관함 저장 및 본문 직접 편집 상태
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [loadedFromStorageId, setLoadedFromStorageId] = useState<string | null>(null);

  // 아무 생각 없을 때 랜덤 럭키 픽 상태
  const [isLuckyGenerated, setIsLuckyGenerated] = useState(false);
  const [luckyTimeLabel, setLuckyTimeLabel] = useState<string>("");
  const [timeContext, setTimeContext] = useState(() => getCurrentTimeContext());

  // 초기 로드 시 localStorage 복원 및 기본 추천 주제 로드
  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem("threads_planner_provider") as AIModelProvider | null;
      const savedModel = localStorage.getItem("threads_planner_model");
      if (savedProvider && ["openai", "anthropic", "gemini"].includes(savedProvider)) {
        setSelectedProvider(savedProvider);
        if (savedModel && AI_MODEL_OPTIONS.some((o) => o.value === savedModel && o.provider === savedProvider)) {
          setSelectedModel(savedModel);
        } else {
          setSelectedModel(DEFAULT_AI_MODELS[savedProvider]);
        }
      }
    } catch {
      // ignore
    }

    // 보관함에서 넘어온 글 로드 처리 (sessionStorage 또는 ?load=<id>)
    if (typeof window !== "undefined") {
      try {
        const storedPlanJson = sessionStorage.getItem("tep_load_plan");
        if (storedPlanJson) {
          sessionStorage.removeItem("tep_load_plan");
          const plan: SavedThreadPlan = JSON.parse(storedPlanJson);
          loadSavedPlanIntoState(plan);
          return;
        }
      } catch (e) {
        console.warn("sessionStorage 로드 에러:", e);
      }

      const urlParams = new URLSearchParams(window.location.search);
      const loadId = urlParams.get("load");
      if (loadId) {
        loadPlanByIdFromStorage(loadId).then((plan) => {
          if (plan) {
            loadSavedPlanIntoState(plan);
          }
        });
      }
    }
  }, []);

  function loadSavedPlanIntoState(plan: SavedThreadPlan) {
    const threadResult: ThreadPlanResult = {
      topic: plan.topic,
      hook: plan.hook,
      whyHookWorks: plan.hook_reason,
      hookVariants: plan.hook_variants || [],
      content: plan.body_text,
      cta: plan.reply_cta || "",
      followUpIdeas: plan.follow_up_topics || [],
    };
    setCurrentPlan(threadResult);
    setEditedContent(plan.body_text);
    setTopicInput(plan.topic);
    if (plan.persona_id) setActivePersonaId(plan.persona_id);
    if (plan.persona_name) setUsedPersonaLabel(plan.persona_name);
    if (plan.model_label) setUsedModelLabel(plan.model_label);
    setLoadedFromStorageId(plan.id);
    setIsSaved(true);
    setIsEditingContent(false);
    showCopyToast(`📂 [${plan.topic}] 콘텐츠를 보관함에서 불러왔습니다! 수정 후 다시 저장할 수 있습니다.`);
  }

  function handleSelectProvider(provider: AIModelProvider) {
    setSelectedProvider(provider);
    const defaultModel = DEFAULT_AI_MODELS[provider];
    setSelectedModel(defaultModel);
    try {
      localStorage.setItem("threads_planner_provider", provider);
      localStorage.setItem("threads_planner_model", defaultModel);
    } catch {
      // ignore
    }
  }

  function handleSelectModel(modelVal: string) {
    setSelectedModel(modelVal);
    try {
      localStorage.setItem("threads_planner_model", modelVal);
    } catch {
      // ignore
    }
  }

  // 미디어(이미지/동영상) 드래그앤드롭 상태
  const [isDragging, setIsDragging] = useState(false);

  // 파일 선택 및 처리 핸들러 (여러 장 동시 선택 또는 추가 선택 지원)
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    await processSelectedFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function processSelectedFiles(files: File[]) {
    setIsProcessingMedia(true);
    setErrorMessage(null);
    try {
      // 1. 동영상 파일 포함 여부 확인
      const videoFiles = files.filter((f) => f.type.startsWith("video/"));
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));

      if (videoFiles.length === 0 && imageFiles.length === 0) {
        setErrorMessage("이미지(JPG, PNG, WEBP 등) 또는 동영상(MP4, MOV, WEBM 등) 파일만 지원됩니다.");
        return;
      }

      // 동영상이 포함되어 있는 경우: 동영상은 1개만 단독 처리
      if (videoFiles.length > 0) {
        const videoFile = videoFiles[0];
        if (videoFile.size > 100 * 1024 * 1024) {
          setErrorMessage("동영상은 100MB 이하 파일만 첨부할 수 있습니다.");
          return;
        }
        if (files.length > 1) {
          showCopyToast("🎬 동영상은 1개만 첨부할 수 있어 첫 번째 동영상을 분석합니다.");
        }
        const processed = await processVideoFile(videoFile);
        setMediaAttachment({
          ...processed,
          fileSize: videoFile.size,
        });
        return;
      }

      // 2. 이미지만 있는 경우 (다중 이미지 최대 5장)
      const existingItems =
        mediaAttachment?.type === "image" && mediaAttachment.imageItems
          ? mediaAttachment.imageItems
          : [];

      const remainingSlots = 5 - existingItems.length;
      if (remainingSlots <= 0) {
        setErrorMessage("이미지는 최대 5장까지 첨부할 수 있습니다. 기존 이미지를 삭제 후 추가해주세요.");
        return;
      }

      const filesToProcess = imageFiles.slice(0, remainingSlots);
      if (imageFiles.length > remainingSlots) {
        showCopyToast(`📸 이미지는 최대 5장까지 가능하여 ${remainingSlots}장만 추가되었습니다.`);
      }

      // 각 파일 크기 체크 (장당 30MB)
      for (const f of filesToProcess) {
        if (f.size > 30 * 1024 * 1024) {
          setErrorMessage(`이미지 파일(${f.name})은 30MB 이하만 첨부할 수 있습니다.`);
          return;
        }
      }

      const newProcessedItems = await processMultipleImages(filesToProcess);
      const combinedItems = [...existingItems, ...newProcessedItems];
      const newAttachment = buildMediaAttachmentFromImages(combinedItems);
      setMediaAttachment(newAttachment);
    } catch (err) {
      console.error("미디어 처리 오류:", err);
      const msg = err instanceof Error ? err.message : "미디어 파일 분석 중 오류가 발생했습니다.";
      setErrorMessage(msg);
    } finally {
      setIsProcessingMedia(false);
    }
  }

  // 특정 단일 이미지 삭제 (다중 이미지 중 1장 삭제)
  function handleRemoveSingleImage(id: string) {
    if (!mediaAttachment || mediaAttachment.type !== "image" || !mediaAttachment.imageItems) {
      handleRemoveMedia();
      return;
    }
    const remaining = mediaAttachment.imageItems.filter((item) => item.id !== id);
    if (remaining.length === 0) {
      handleRemoveMedia();
    } else {
      setMediaAttachment(buildMediaAttachmentFromImages(remaining));
    }
  }

  function handleRemoveMedia() {
    setMediaAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      await processSelectedFiles(files);
    }
  }

  // 1. [핵심] 6대 상황별 페르소나 버튼 클릭: 해당 페르소나의 상황·말투로 즉시 글 생성!
  async function handleClickPersonaButton(persona: PlannerPersona) {
    setActivePersonaId(persona.id);
    const defaultTopicForMedia = mediaAttachment
      ? (mediaAttachment.type === "video"
          ? "동영상 현장 리얼 썰"
          : (mediaAttachment.imageCount || 1) > 1
            ? `사진 ${mediaAttachment.imageCount}장 비교 현장 썰`
            : "사진 현장 리얼 썰")
      : persona.defaultTopic;
    const topicToUse = topicInput.trim() || templateProduct.trim() || defaultTopicForMedia;
    setGeneratingLabel(persona.name);
    await handleGenerate(topicToUse, persona.id, persona.name);
  }

  // 2. 글 생성 실행
  async function handleGenerate(
    targetTopic?: string,
    personaId?: string,
    customLabel?: string,
    customTemplateInput?: ThreadPlannerTemplateInput
  ) {
    let topicToUse = (targetTopic || topicInput).trim();
    if (!topicToUse && templateProduct.trim()) {
      topicToUse = `${templateProduct.trim()} 썰`;
    }
    // 미디어가 첨부되어 있는 경우 키워드가 없어도 시각 분석 글 생성 허용
    if (!topicToUse && mediaAttachment) {
      topicToUse =
        mediaAttachment.type === "video"
          ? "동영상 현장 리얼 썰"
          : (mediaAttachment.imageCount || 1) > 1
            ? `사진 ${mediaAttachment.imageCount}장 비교 현장 썰`
            : "사진 현장 리얼 썰";
    }

    if (!topicToUse && !mediaAttachment) {
      setErrorMessage("주제를 입력하거나 사진/영상을 첨부해주세요 (또는 페르소나 버튼/추천 프리셋 선택).");
      return;
    }

    const effectivePersonaId = personaId || activePersonaId || undefined;
    const personaObj = effectivePersonaId ? PLANNER_PERSONAS.find(p => p.id === effectivePersonaId) : null;
    const effectiveLabel = customLabel || (personaObj ? personaObj.name : null);

    // 템플릿 데이터 조합
    let templateDataToSend: ThreadPlannerTemplateInput | undefined = customTemplateInput;
    if (!templateDataToSend && (templateProduct.trim() || templateExperience.trim())) {
      templateDataToSend = {
        product: templateProduct.trim() || undefined,
        experience: templateExperience.trim() || undefined,
        targetAudience: templateTarget.trim() || undefined,
        benchmarkPost: templateBenchmark.trim() || undefined,
      };
    }

    setIsGenerating(true);
    setGeneratingLabel(effectiveLabel);
    setErrorMessage(null);
    try {
      const res = await generateThreadPlanAction(
        topicToUse,
        undefined,
        {
          provider: selectedProvider,
          model: selectedModel,
        },
        templateDataToSend,
        effectivePersonaId,
        mediaAttachment
          ? {
              type: mediaAttachment.type,
              fileName: mediaAttachment.fileName,
              mimeType: mediaAttachment.mimeType,
              base64List: mediaAttachment.base64List,
              videoDuration: mediaAttachment.videoDuration,
            }
          : undefined
      );
      if (res.needApiKey) {
        setMissingProviderName(res.missingProvider ? PROVIDER_SHORT_LABELS[res.missingProvider] : PROVIDER_SHORT_LABELS[selectedProvider]);
        setNeedApiKeyModal(true);
        return;
      }
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "글 생성에 실패했습니다.");
        return;
      }
      setCurrentPlan(res.data);
      setEditedContent(res.data.content);
      setIsEditingContent(false);
      setLoadedFromStorageId(null);
      const activeModelObj = AI_MODEL_OPTIONS.find((o) => o.value === selectedModel);
      setUsedModelLabel(activeModelObj ? activeModelObj.shortLabel : selectedModel);
      setUsedPersonaLabel(effectiveLabel);
      setExpandedHookIdx(null);

      // ★ 생성 즉시 보관함에 자동 저장 (수동 클릭 누락 방지)
      savePlanToStorage({
        topic: res.data.topic,
        hook: res.data.hook,
        hookReason: res.data.whyHookWorks,
        hookVariants: res.data.hookVariants,
        bodyText: res.data.content,
        replyCta: res.data.cta,
        followUpTopics: res.data.followUpIdeas,
        personaId: effectivePersonaId || undefined,
        personaName: effectiveLabel || undefined,
        modelLabel: activeModelObj ? activeModelObj.shortLabel : selectedModel,
      }).then((saveRes) => {
        if (saveRes.success) {
          setIsSaved(true);
        }
      }).catch(() => {
        // silent fail
      });
    } catch {
      setErrorMessage("글 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
      setGeneratingLabel(null);
    }
  }

  // 4. "오늘 뭐 쓰지?" 카테고리 기반 주제 추천
  async function handleSuggestTopics(categoryId?: string) {
    const targetCat = categoryId || selectedCategory || "tips";
    setSelectedCategory(targetCat);
    setShowCategoryPicker(true);
    setIsSuggesting(true);
    setErrorMessage(null);
    try {
      const res = await getSuggestedTopicsAction(targetCat, topicInput.trim() || undefined, {
        provider: selectedProvider,
        model: selectedModel,
      });
      if (res.needApiKey) {
        setMissingProviderName(res.missingProvider ? PROVIDER_SHORT_LABELS[res.missingProvider] : PROVIDER_SHORT_LABELS[selectedProvider]);
        setNeedApiKeyModal(true);
        return;
      }
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "주제 추천에 실패했습니다.");
        return;
      }
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) {
        setErrorMessage("추천 주제를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSuggestedTopics(list);
      showCopyToast("🎲 오늘 뭐 쓰지? 추천 주제 10선이 아래에 준비되었습니다!");
      setTimeout(() => {
        topicsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSuggesting(false);
    }
  }

  // 아무 생각 없을 때를 위한 원클릭 럭키 픽 실행 (요일/시간대 기반 검증된 썰 즉시 생성)
  async function handleLuckyRandomGenerate() {
    const pick = getRandomLuckyPick();
    setTopicInput(pick.topic);
    setActivePersonaId(pick.personaId);
    setIsLuckyGenerated(true);
    setLuckyTimeLabel(pick.timeLabel);
    showCopyToast(`🎰 [${pick.timeLabel}] 맞춤 추천 썰을 즉시 작성합니다!`);
    await handleGenerate(pick.topic, pick.personaId, `랜덤 픽 (${pick.timeLabel})`);
  }

  // 3대 감정 무드 칩 원클릭 실행
  async function handleMoodChipClick(chip: QuickMoodChip) {
    const randomSeed = chip.seedTopics[Math.floor(Math.random() * chip.seedTopics.length)];
    setTopicInput(randomSeed);
    setActivePersonaId(chip.personaId);
    setIsLuckyGenerated(true);
    setLuckyTimeLabel(chip.label);
    showCopyToast(`✨ [${chip.label}] 썰을 즉시 작성합니다!`);
    await handleGenerate(randomSeed, chip.personaId, chip.label);
  }

  // 5. 추천 주제 카드 선택 후 즉시 글 생성
  async function handleSelectTopicAndGenerate(selectedTopic: string) {
    setTopicInput(selectedTopic);
    await handleGenerate(selectedTopic, activePersonaId || undefined);
  }

  // 6. 7종 "다시 써줘" 원클릭 리라이팅
  async function handleRewrite(mode: RewriteMode) {
    if (!currentPlan) return;

    setIsRewriting(true);
    setActiveRewriteMode(mode);
    setErrorMessage(null);
    try {
      const res = await rewriteThreadPlanAction(currentPlan, mode, {
        provider: selectedProvider,
        model: selectedModel,
      });
      if (res.needApiKey) {
        setMissingProviderName(res.missingProvider ? PROVIDER_SHORT_LABELS[res.missingProvider] : PROVIDER_SHORT_LABELS[selectedProvider]);
        setNeedApiKeyModal(true);
        return;
      }
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "다시 쓰기에 실패했습니다.");
        return;
      }
      setCurrentPlan(res.data);
      setEditedContent(res.data.content);
      setIsSaved(false);
      setIsEditingContent(false);
      const activeModelObj = AI_MODEL_OPTIONS.find((o) => o.value === selectedModel);
      setUsedModelLabel(activeModelObj ? activeModelObj.shortLabel : selectedModel);
      showCopyToast("새로운 버전으로 다시 작성되었습니다!");
    } catch {
      setErrorMessage("다시 쓰기 중 오류가 발생했습니다.");
    } finally {
      setIsRewriting(false);
      setActiveRewriteMode(null);
    }
  }

  // 7. 5대 훅 유형 대안으로 메인 본문 즉시 전환
  function handleApplyHookVariant(variant: HookVariant) {
    if (!currentPlan) return;
    const updated = {
      ...currentPlan,
      hook: variant.hook,
      hookType: variant.type,
      whyHookWorks: variant.whyItWorks,
      content: variant.content || currentPlan.content,
    };
    setCurrentPlan(updated);
    setEditedContent(updated.content);
    setIsSaved(false);
    setIsEditingContent(false);
    showCopyToast(`🎯 [${variant.type}] 버전으로 본문이 적용되었습니다!`);
  }

  // 8. 콘텐츠 보관함에 저장하기
  async function handleSaveToStorage() {
    if (!currentPlan) return;
    setIsSaving(true);
    try {
      const contentToSave = isEditingContent ? editedContent : currentPlan.content;
      const res = await savePlanToStorage({
        topic: currentPlan.topic,
        hook: currentPlan.hook,
        hookReason: currentPlan.whyHookWorks,
        hookVariants: currentPlan.hookVariants,
        bodyText: contentToSave,
        replyCta: currentPlan.cta,
        followUpTopics: currentPlan.followUpIdeas,
        personaId: activePersonaId || undefined,
        personaName: usedPersonaLabel || undefined,
        modelLabel: usedModelLabel || undefined,
      });

      if (res.success) {
        setIsSaved(true);
        showCopyToast(
          res.isLocalOnly
            ? "💾 보관함에 안전하게 저장되었습니다!"
            : "💾 내 콘텐츠 보관함에 성공적으로 저장되었습니다!"
        );
      } else {
        setErrorMessage(res.error || "보관함 저장에 실패했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  // 9. 본문 직접 편집 완료 및 적용
  function handleApplyEditedContent() {
    if (!currentPlan) return;
    setCurrentPlan({
      ...currentPlan,
      content: editedContent,
    });
    setIsEditingContent(false);
    setIsSaved(false);
    showCopyToast("✏️ 본문 수정이 완료되었습니다! '보관함에 저장'을 눌러 안전하게 보관하세요.");
  }

  // 복사 헬퍼
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showCopyToast(`📋 ${label} 클립보드에 복사되었습니다!`);
  }

  function showCopyToast(msg: string) {
    setCopySuccess(msg);
    setTimeout(() => setCopySuccess(null), 2500);
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-28 md:pb-16">
      {/* 토스트 알림 */}
      {copySuccess && (
        <div className="fixed top-6 right-6 z-50 rounded-xl bg-neutral-900 text-white px-4 py-2.5 text-sm font-medium shadow-xl border border-neutral-700 animate-in fade-in slide-in-from-top-2">
          {copySuccess}
        </div>
      )}

      {/* 에러 알림 */}
      {errorMessage && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-semibold ml-4 cursor-pointer"
          >
            닫기
          </button>
        </div>
      )}

      {/* 보관함에서 불러온 글 알림 배너 */}
      {loadedFromStorageId && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs md:text-sm text-amber-950 font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">📂</span>
            <span>보관함에서 불러온 글을 수정 중입니다. 수정한 내용은 아래 &apos;보관함에 저장&apos; 버튼으로 언제든 다시 저장할 수 있습니다.</span>
          </div>
          <button
            type="button"
            onClick={() => setLoadedFromStorageId(null)}
            className="text-xs text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
          >
            알림 닫기
          </button>
        </div>
      )}

      {/* 메인 히어로 */}
      <section className="text-center pt-2 md:pt-6 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700">
          <span>⚡ 초보자 맞춤형</span>
          <span className="text-neutral-300">•</span>
          <span>원클릭 상황별 페르소나 스레드 기획</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight">
          오늘 스레드 뭐 쓰지? 🤔
        </h1>
        <p className="text-sm md:text-base text-neutral-500 max-w-xl mx-auto leading-relaxed">
          고민하지 마세요. 아래 <strong>가전 주부형, 독신형, 워킹맘</strong> 등 원하는 버튼만 누르면,
          <br className="hidden sm:block" />
          피드를 멈추는 <strong>5대 훅부터 4단계 공감 본문</strong>까지 상황에 맞게 3초 만에 완성됩니다.
        </p>
      </section>

      {/* 메인 인터랙션 패널 */}
      <div className="rounded-3xl bg-white p-5 md:p-6 shadow-sm border border-neutral-200/80 space-y-6">
        {/* 1. 키워드/소재 입력 바 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  handleGenerate();
                }
              }}
              placeholder={
                mediaAttachment
                  ? "사진/영상에 덧붙일 설명이나 상품명을 적어보세요 (비워두면 사진/영상 상황만으로 자동 생성!)"
                  : "소재나 상품명을 입력하세요 (예: 전자레인지 찜기, 세탁조 클리너, 섀도, 월요병) - 비워두고 아래 버튼 클릭 가능!"
              }
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/50 px-4 py-3.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 transition-all font-medium"
            />
            {topicInput && (
              <button
                type="button"
                onClick={() => setTopicInput("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* 0. 🎰 아무 생각 없을 때 (원클릭 썰) - 메인 추천 기능! */}
            <button
              type="button"
              onClick={handleLuckyRandomGenerate}
              disabled={isGenerating}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black px-4 py-3.5 text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              title="아무런 생각이 안 날 때! 요일과 시간대에 맞춘 떡상 썰을 원클릭으로 바로 작성합니다"
            >
              <Dices className="w-4 h-4 text-purple-200" />
              <span>{isGenerating && isLuckyGenerated ? "랜덤 썰 작성 중..." : "아무 생각 없을 때 (랜덤 썰)"}</span>
            </button>

            {/* 1. 오늘 뭐 쓰지? 버튼 */}
            <button
              type="button"
              onClick={() => {
                if (mediaAttachment) {
                  // ★ 사진/영상이 첨부된 경우: 사진을 분석하여 바로 글 생성 실행!
                  handleGenerate();
                  return;
                }
                if (!showCategoryPicker) {
                  setShowCategoryPicker(true);
                }
                handleSuggestTopics(selectedCategory || undefined);
              }}
              disabled={isSuggesting || isGenerating}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-3.5 text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span>{isSuggesting || (mediaAttachment && isGenerating && !isLuckyGenerated) ? "⏳" : "🎲"}</span>
              <span>
                {mediaAttachment
                  ? isGenerating && !isLuckyGenerated
                    ? "사진 분석 작성 중..."
                    : "오늘 뭐 쓰지? (사진 분석)"
                  : isSuggesting
                    ? "주제 추천 중..."
                    : "오늘 뭐 쓰지?"}
              </span>
            </button>

            {/* 2. 글 생성 버튼 */}
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold px-5 py-3.5 text-sm transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <span>{isGenerating && !isLuckyGenerated ? "✍️" : "✨"}</span>
              <span>
                {isGenerating && !isLuckyGenerated
                  ? "작성 중..."
                  : mediaAttachment
                    ? "사진 분석 글 생성하기"
                    : "글 생성하기"}
              </span>
            </button>
          </div>
        </div>

        {/* 1-0. 아무 생각 없을 때를 위한 3초 감정 무드 칩 & 현재 시간대 추천 바 */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[11px] font-extrabold text-neutral-600 flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-full shrink-0">
            <span>⏰</span>
            <span>{timeContext.timeLabel} 맞춤:</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_MOOD_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleMoodChipClick(chip)}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-900 text-neutral-700 hover:text-white border border-neutral-200/90 hover:border-neutral-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 group"
                title={chip.tagline}
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
                <span className="text-[10px] text-neutral-400 group-hover:text-amber-300">⚡</span>
              </button>
            ))}
          </div>
        </div>

        {/* 1-1. [신규] 이미지/동영상 시각 분석 첨부 영역 ('오늘 뭐 쓰지' 바로 아래) */}
        <div className="pt-0.5">
          {/* 숨겨진 파일 인풋 (다중 선택 지원) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isProcessingMedia ? (
            /* 미디어 처리/분석 중 로더 */
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex items-center justify-center gap-3 text-neutral-700">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-800" />
              <div className="text-sm font-semibold">
                미디어 최적화 및 시각 분석 데이터를 추출하는 중입니다... (고화질 사진/영상도 가볍게 변환)
              </div>
            </div>
          ) : mediaAttachment ? (
            /* 미디어 첨부 완료 미리보기 카드 */
            <div className="rounded-2xl border border-neutral-300 bg-white p-4 shadow-sm space-y-3.5">
              {/* 동영상 첨부 카드 */}
              {mediaAttachment.type === "video" ? (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                        <img
                          src={mediaAttachment.previewUrl}
                          alt="동영상 미리보기"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white rounded p-0.5 text-[10px]">
                          <VideoIcon className="w-3 h-3" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            동영상 분석 준비 완료
                          </span>
                          {mediaAttachment.videoDuration && (
                            <span className="text-[11px] text-neutral-500 font-medium">
                              재생 약 {Math.round(mediaAttachment.videoDuration)}초
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-neutral-900 truncate mt-1">
                          {mediaAttachment.fileName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          핵심 장면 3컷 추출 완료 · AI가 상황과 맥락을 분석해 썰을 풀어냅니다
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleGenerate()}
                        disabled={isGenerating}
                        className="text-xs font-bold bg-neutral-900 hover:bg-black text-white px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isGenerating ? "영상 분석 중..." : "글 생성하기"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        다른 파일로 변경
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                        title="첨부 파일 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>삭제</span>
                      </button>
                    </div>
                  </div>

                  {/* 캡처된 3개 프레임 미리보기 */}
                  {mediaAttachment.base64List.length > 1 && (
                    <div className="pt-2 border-t border-neutral-100 flex items-center gap-2 overflow-x-auto">
                      <span className="text-[11px] font-semibold text-neutral-500 shrink-0">
                        🎬 AI 분석 장면:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {mediaAttachment.base64List.map((b64, idx) => (
                          <div
                            key={idx}
                            className="relative w-12 h-10 rounded border border-neutral-200 overflow-hidden bg-neutral-100 shrink-0"
                          >
                            <img
                              src={`data:${mediaAttachment.mimeType};base64,${b64}`}
                              alt={`장면 ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1 font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        (초반·중반·후반 핵심 순간을 골라 AI에게 전달합니다)
                      </span>
                    </div>
                  )}
                </>
              ) : (
                /* 이미지 첨부 카드 (단일 또는 다중 이미지 갤러리) */
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {(mediaAttachment.imageCount || 1) > 1
                            ? `사진 ${mediaAttachment.imageCount}장 비교 분석 준비 완료`
                            : "사진 1장 분석 준비 완료"}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-medium">
                          최대 5장 첨부 가능
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-900 truncate mt-1">
                        {mediaAttachment.fileName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {(mediaAttachment.imageCount || 1) > 1
                          ? "순서별 변화와 비포&애프터 차이를 AI가 입체적으로 분석해 썰을 작성합니다"
                          : "고해상도 이미지 시각 정보 주입 완료 · 사진 속 디테일을 바탕으로 글이 작성됩니다"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleGenerate()}
                        disabled={isGenerating}
                        className="text-xs font-bold bg-neutral-900 hover:bg-black text-white px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isGenerating ? "사진 분석 중..." : "글 생성하기"}</span>
                      </button>
                      {(mediaAttachment.imageCount || 1) < 5 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-semibold text-neutral-700 hover:text-black px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>사진 추가 ({5 - (mediaAttachment.imageCount || 1)}장 남음)</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                        title="전체 사진 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>전체 삭제</span>
                      </button>
                    </div>
                  </div>

                  {/* 첨부된 사진 썸네일 그리드 (개별 삭제 및 순서 라벨 제공) */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center gap-2.5 overflow-x-auto pb-1">
                    {(mediaAttachment.imageItems || []).map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 group shadow-2xs"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.fileName}
                          className="w-full h-full object-cover"
                        />
                        {/* 순서 라벨 */}
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                          #{idx + 1}
                        </span>
                        {/* 개별 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleImage(item.id)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-1 transition-colors cursor-pointer"
                          title="이 사진 삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* 5장 미만일 때 추가 버튼 슬롯 */}
                    {(mediaAttachment.imageCount || 1) < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50/50 hover:bg-neutral-50 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-neutral-900 transition-all cursor-pointer"
                        title="사진 추가하기"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px] font-bold">추가</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* 미디어 미첨부 시 드롭존 카드 */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group cursor-pointer rounded-2xl border-2 border-dashed transition-all p-3.5 sm:p-4 text-center ${
                isDragging
                  ? "border-neutral-900 bg-neutral-100/80 scale-[1.005]"
                  : "border-neutral-200/90 hover:border-neutral-400 bg-neutral-50/40 hover:bg-neutral-50/90"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-neutral-600">
                <div className="flex items-center gap-1.5 text-neutral-700 font-semibold text-sm">
                  <div className="p-1.5 rounded-xl bg-neutral-100 group-hover:bg-white transition-colors border border-neutral-200 flex items-center gap-1 text-neutral-800">
                    <ImageIcon className="w-4 h-4 text-neutral-700" />
                    <VideoIcon className="w-4 h-4 text-neutral-700" />
                  </div>
                  <span>사진(최대 5장) 또는 동영상 첨부하기</span>
                  <span className="text-xs text-neutral-400 font-normal hidden md:inline">
                    (클릭 또는 드래그앤드롭)
                  </span>
                </div>

                <div className="text-xs text-neutral-500 font-normal">
                  <span className="text-neutral-400 hidden sm:inline">|</span>{" "}
                  <span className="text-neutral-700 font-medium">📸 비포&애프터 비교 샷이나 여러 장의 제품 컷</span>,{" "}
                  <span className="text-neutral-700 font-medium">🎬 영상</span>을 올리면 AI가 시각 정보를 직접 비교 분석하여 생생한 썰을 풀어냅니다
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. ★ 핵심 기능: 다양한 상황별 페르소나 원클릭 글 생성 버튼 그리드 (6대 페르소나) */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-sm md:text-base font-extrabold text-neutral-900 flex items-center gap-2">
              <span className="text-lg">🎭</span>
              <span>상황별 페르소나 원클릭 생성</span>
              <span className="text-xs md:text-sm font-semibold text-neutral-500 hidden sm:inline">
                (클릭 즉시 그 시점과 상황의 글이 완성됩니다)
              </span>
            </span>
            <span className="text-[11px] md:text-xs font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
              ⚡ 버튼 클릭 즉시 글 완성
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {PLANNER_PERSONAS.map((persona) => {
              const isCurrent = activePersonaId === persona.id;
              const isThisGenerating = isGenerating && generatingLabel === persona.name;
              return (
                <button
                  key={persona.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleClickPersonaButton(persona)}
                  className={`text-left rounded-2xl border p-3.5 transition-all group flex flex-col justify-between cursor-pointer active:scale-98 shadow-xs ${
                    isCurrent
                      ? "border-neutral-900 bg-neutral-900 text-white ring-2 ring-neutral-900 shadow-md"
                      : "border-neutral-200 bg-neutral-50/70 hover:bg-white hover:border-neutral-400 text-neutral-800"
                  } ${isGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-base flex items-center gap-1.5 font-black">
                        <span>{persona.emoji}</span>
                        <span className={`text-sm ${isCurrent ? "text-white" : "text-neutral-900 font-bold"}`}>
                          {persona.name}
                        </span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCurrent
                            ? "bg-amber-400 text-neutral-950 font-black"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {persona.badge}
                      </span>
                    </div>

                    <div
                      className={`text-xs leading-snug line-clamp-2 ${
                        isCurrent ? "text-neutral-200" : "text-neutral-600"
                      }`}
                    >
                      {persona.tagline}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-neutral-200/50 flex items-center justify-between text-[11px]">
                    <span className={isCurrent ? "text-amber-300 font-semibold" : "text-neutral-400"}>
                      {isThisGenerating ? "✍️ 작성 중..." : "클릭하여 바로 생성 →"}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">⚡</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>


        {/* 3. ✍️ 맞춤글 생성 (내 실제 경험담 · 상품명 · 타깃 직접 입력) */}
        <div className="pt-2 border-t border-neutral-200/80">
          <button
            type="button"
            onClick={() => setShowTemplateForm(!showTemplateForm)}
            className="w-full flex items-center justify-between p-3.5 md:p-4 rounded-2xl bg-neutral-50 hover:bg-neutral-100/90 border border-neutral-200/90 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2.5 md:gap-3 text-left">
              <span className="text-lg md:text-xl">✍️</span>
              <div>
                <div className="text-sm md:text-base font-extrabold text-neutral-900 group-hover:text-black flex flex-wrap items-center gap-2">
                  <span>맞춤글 생성 (내 실제 경험담 · 상품명 · 타깃 직접 입력)</span>
                </div>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  내가 직접 겪은 썰이나 특정 상품명을 넣어 100% 리얼하고 자연스러운 글을 완성합니다.
                </p>
              </div>
            </div>
            <span className="text-xs md:text-sm font-bold text-neutral-700 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 group-hover:border-neutral-400 group-hover:text-neutral-950 flex items-center gap-1 shrink-0 ml-2">
              <span>{showTemplateForm ? "접기 ▲" : "펼치기 ▼"}</span>
            </span>
          </button>

          {showTemplateForm && (
            <div className="mt-3 p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/80 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    연결할 상품/핵심 소재 (본문에는 숨겨지고 첫 댓글 CTA로 유도됨)
                  </label>
                  <input
                    type="text"
                    value={templateProduct}
                    onChange={(e) => setTemplateProduct(e.target.value)}
                    placeholder="예: 실리콘 전자레인지 찜기, 세탁조 클리너"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    타깃 독자
                  </label>
                  <input
                    type="text"
                    value={templateTarget}
                    onChange={(e) => setTemplateTarget(e.target.value)}
                    placeholder="예: 20대 후반 자취 직장인, 살림하는 주부"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    내 실제 경험담 / 상황 (지어내지 않고 솔직한 리얼 썰)
                  </label>
                  <textarea
                    rows={2}
                    value={templateExperience}
                    onChange={(e) => setTemplateExperience(e.target.value)}
                    placeholder="예: 퇴근 후 설거지가 너무 싫어서 저녁을 자주 거르다가 샀음. 써 본 지 2주째인데 삶의 질 수직 상승"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    참고할 터진 글 원문 (선택 사항 - 벤치마킹할 스레드 글이 있다면 붙여넣기)
                  </label>
                  <textarea
                    rows={2}
                    value={templateBenchmark}
                    onChange={(e) => setTemplateBenchmark(e.target.value)}
                    placeholder="예: 넘더러워서 안 올리려다 추천해준 치니 고마워서 올림... 워싱소다 다 소용없더라"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleGenerate()}
                  className="rounded-xl bg-neutral-900 hover:bg-black text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  ✨ 입력한 템플릿으로 글 생성하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. 🔥 아무런 아이디어가 없을 때!!! (업종/타깃별 추천 주제 10선) */}
        {showCategoryPicker && (
          <div ref={topicsSectionRef} className="pt-4 border-t border-neutral-200/80 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 text-white text-xs md:text-sm font-black shadow-xs tracking-tight animate-pulse">
                  🔥 아무런 아이디어가 없을 때!!!
                </span>
                <span className="text-sm md:text-base font-extrabold text-neutral-900 flex items-center gap-1.5">
                  <span>업종/타깃별 추천 주제 10선</span>
                  <span className="text-xs md:text-sm font-semibold text-neutral-500 hidden sm:inline">
                    (원하는 업종을 누르거나 추천 카드를 클릭해보세요)
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSuggestTopics(selectedCategory)}
                disabled={isSuggesting}
                className="text-xs md:text-sm text-amber-700 hover:text-amber-900 font-bold bg-amber-100/80 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>🔄</span>
                <span>새로 추천받기</span>
              </button>
            </div>

            {/* 업종 칩 목록 */}
            <div className="flex flex-wrap gap-1.5">
              {TARGET_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      handleSuggestTopics(cat.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? "bg-neutral-900 text-white shadow-sm ring-2 ring-neutral-900"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* 추천된 10개 주제 목록 */}
            {isSuggesting ? (
              <div className="py-6 text-center space-y-2">
                <div className="inline-block animate-spin text-2xl">🌀</div>
                <div className="text-xs font-semibold text-neutral-600">
                  스레드에서 지금 가장 반응 좋은 주제 10개를 발굴하고 있어요...
                </div>
              </div>
            ) : suggestedTopics.length > 0 ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedTopics.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => handleSelectTopicAndGenerate(item.topic)}
                      className="text-left rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all group flex flex-col justify-between cursor-pointer shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 group-hover:bg-neutral-800 group-hover:text-amber-300">
                            #{idx + 1}
                          </span>
                          <span className="text-[11px] text-neutral-400 group-hover:text-neutral-300 line-clamp-1">
                            {item.whyItWorks}
                          </span>
                        </div>
                        <div className="font-bold text-xs md:text-sm text-neutral-900 group-hover:text-white leading-snug">
                          {item.topic}
                        </div>
                      </div>
                      <div className="mt-1.5 text-[11px] text-neutral-500 group-hover:text-neutral-300 italic truncate">
                        &quot;{item.hookPreview}&quot;
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <button
                  type="button"
                  onClick={() => handleSuggestTopics(selectedCategory)}
                  className="text-xs font-bold text-amber-700 hover:underline"
                >
                  🎲 [{TARGET_CATEGORIES.find(c => c.id === selectedCategory)?.name || "생활꿀팁"}] 추천 주제 10선 불러오기 클릭
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. AI 추론 엔진 선택 (OpenAI / Claude / Gemini) */}
        <details className="pt-3 border-t border-neutral-100 group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100">
            <span>⚙️ 고급 AI 설정</span>
            <span className="text-[11px] font-medium text-neutral-500 group-open:hidden">필요할 때 열기</span>
            <span className="hidden text-[11px] font-medium text-neutral-500 group-open:inline">접기</span>
          </summary>
          <div className="pt-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <span>🤖</span>
              <span>AI 추론 엔진 선택</span>
            </span>
            <span className="text-[11px] text-neutral-500 font-medium">
              현재 설정: <strong className="text-neutral-900 font-bold">{AI_MODEL_OPTIONS.find((o) => o.value === selectedModel)?.shortLabel || selectedModel}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            {/* 3대 Provider 버튼 (OpenAI / Claude / Gemini) */}
            <div className="sm:col-span-6 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectProvider("openai")}
                className={`rounded-xl py-2 px-1 border font-bold text-center flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedProvider === "openai"
                    ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                    : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                }`}
              >
                <span>🤖</span>
                <span className="text-xs">OpenAI</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProvider("anthropic")}
                className={`rounded-xl py-2 px-1 border font-bold text-center flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedProvider === "anthropic"
                    ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                    : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                }`}
              >
                <span>🧠</span>
                <span className="text-xs">Claude</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProvider("gemini")}
                className={`rounded-xl py-2 px-1 border font-bold text-center flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedProvider === "gemini"
                    ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                    : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                }`}
              >
                <span>✨</span>
                <span className="text-xs">Gemini</span>
              </button>
            </div>

            {/* 세부 실행 모델 드롭다운 셀렉터 */}
            <div className="sm:col-span-6">
              <select
                value={selectedModel}
                onChange={(e) => handleSelectModel(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none shadow-xs cursor-pointer"
              >
                {AI_MODEL_OPTIONS.filter((opt) => opt.provider === selectedProvider).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          </div>
        </details>
      </div>

      <div className="fixed inset-x-0 bottom-[4.5rem] z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3.5 text-sm font-black text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{isGenerating ? "✍️" : "✨"}</span>
          <span>{isGenerating ? "글 작성 중..." : "이 내용으로 글 생성하기"}</span>
        </button>
      </div>

      {/* 로딩 표시 */}
      {isGenerating && (
        <div className="rounded-3xl bg-white border border-neutral-200 p-12 text-center space-y-4 shadow-sm animate-pulse">
          <div className="text-4xl">✍️</div>
          <div className="text-lg font-bold text-neutral-800">
            {generatingLabel ? `[${generatingLabel}] 기반으로` : ""}{" "}
            {PROVIDER_SHORT_LABELS[selectedProvider]} ({AI_MODEL_OPTIONS.find(o => o.value === selectedModel)?.shortLabel || selectedModel}) 글을 작성하고 있어요...
          </div>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            1초 만에 멈추는 5대 훅(자책·부정명령·썰·논쟁·반전)과 4단계 공감 본문, 댓글 유도 질문까지 한 번에 완성 중입니다.
          </p>
        </div>
      )}

      {/* 글 생성 결과 카드 */}
      {currentPlan && !isGenerating && (
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 space-y-0">
          {/* 카드 헤더: 주제명 & 페르소나/모델 배지 & 전체 복사 액션 */}
          <div className="bg-neutral-900 text-white p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                  <span>🎯</span>
                  <span>스레드 기획 완성</span>
                </span>
                {isLuckyGenerated && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/50 text-[11px] font-bold flex items-center gap-1">
                    <span>🎰</span>
                    <span>랜덤 럭키 픽</span>
                  </span>
                )}
                {usedPersonaLabel && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                    🎭 {usedPersonaLabel}
                  </span>
                )}
                {usedModelLabel && (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 font-medium">
                    ⚡ {usedModelLabel}
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-black tracking-tight leading-snug">
                {currentPlan.topic}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* 다른 썰 뽑기 버튼 (랜덤 생성 시 원클릭 재시도 지원) */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleLuckyRandomGenerate}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
                title="다른 떡상 썰을 새로 뽑아서 즉시 작성합니다"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>다른 썰 뽑기</span>
              </button>

              {/* 보관함 저장 버튼 */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveToStorage}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer ${
                  isSaved
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
                title="이 콘텐츠를 보관함에 저장하여 언제든 다시 불러올 수 있습니다"
              >
                <span>{isSaving ? "⏳" : isSaved ? "✅" : "💾"}</span>
                <span>{isSaving ? "저장 중..." : isSaved ? "보관함 저장완료" : "보관함에 저장"}</span>
              </button>

              {/* 전체 글 복사 버튼 */}
              <button
                type="button"
                onClick={() => {
                  const currentBody = isEditingContent ? editedContent : currentPlan.content;
                  const fullText = `[후킹]\n${currentPlan.hook}\n\n[본문]\n${currentBody}\n\n[댓글/CTA]\n${currentPlan.cta}`;
                  copyToClipboard(fullText, "전체 글(후킹+본문+댓글)이");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <span>📋</span>
                <span>전체 복사</span>
              </button>
            </div>
          </div>

          <div className="p-5 md:p-7 space-y-6">
            {/* 1. 피드를 멈추는 첫 문장 후킹 박스 (황금 4단계 1단계) */}
            <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-4 md:p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900 inline-flex items-center gap-1.5">
                    <span>⚡ 1. 첫 문장 후킹 (1초 만에 피드 멈춤)</span>
                  </span>
                  {currentPlan.hookType && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900 text-[11px] font-bold">
                      {currentPlan.hookType}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentPlan.hook, "후킹 문장이")}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                >
                  복사하기
                </button>
              </div>
              <p className="text-base md:text-lg font-black text-neutral-900 leading-snug">
                &ldquo;{currentPlan.hook}&rdquo;
              </p>
              {currentPlan.whyHookWorks && (
                <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-800 leading-relaxed flex items-start gap-1.5">
                  <span className="font-bold flex-shrink-0">💡 멈추게 하는 이유:</span>
                  <span>{currentPlan.whyHookWorks}</span>
                </div>
              )}
            </div>

            {/* 1-1. 5대 훅 유형 대안 글 세트 (자책형, 부정 명령형, 리얼 썰형, 논쟁형, 반전형) */}
            {currentPlan.hookVariants && currentPlan.hookVariants.length > 0 && (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 md:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <span>🎯</span>
                      <span>5대 바이럴 훅 유형별 대안 글 (각각 다른 심리 자극)</span>
                    </span>
                    <span className="text-[11px] text-neutral-400 font-normal">
                      (원하는 버전을 눌러 바로 적용해보세요)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  {currentPlan.hookVariants.map((variant, vIdx) => {
                    const isExpanded = expandedHookIdx === vIdx;
                    return (
                      <div
                        key={vIdx}
                        className="rounded-xl border border-neutral-200 bg-white p-3 space-y-2 hover:border-neutral-400 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-neutral-900 text-white text-[11px] font-bold">
                              {variant.type}
                            </span>
                            <span className="text-xs text-neutral-500 font-medium">
                              {variant.whyItWorks}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplyHookVariant(variant)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              이 버전 본문에 적용 ↵
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedHookIdx(isExpanded ? null : vIdx)}
                              className="text-[11px] text-neutral-400 hover:text-neutral-700 cursor-pointer"
                            >
                              {isExpanded ? "닫기 ▲" : "본문 미리보기 ▼"}
                            </button>
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-neutral-900 pl-1">
                          &ldquo;{variant.hook}&rdquo;
                        </div>

                        {/* 펼쳤을 때 전체 본문 미리보기 및 복사 */}
                        {isExpanded && variant.content && (
                          <div className="pt-2 border-t border-neutral-100 space-y-2 animate-in fade-in duration-150">
                            <div className="whitespace-pre-line text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                              {variant.content}
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(variant.content!, `[${variant.type}] 버전 본문이`)}
                                className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
                              >
                                이 버전 본문만 복사
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. 전체 글 본문 박스 (황금 4단계: 멈춤 → 공감 → 반전 → 질문) */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-4 md:p-6 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-800 inline-flex items-center gap-1.5">
                    <span>📝 2. 스레드 전체 본문 (4~6줄 극압축 친근 반말)</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    (공백 포함 약 {(isEditingContent ? editedContent : currentPlan.content).length}자)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditingContent) {
                        setEditedContent(currentPlan.content);
                        setIsEditingContent(true);
                      } else {
                        handleApplyEditedContent();
                      }
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 px-2.5 py-1 rounded-lg bg-amber-100/80 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    {isEditingContent ? "완료 및 반영 ✓" : "✏️ 직접 수정"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(isEditingContent ? editedContent : currentPlan.content, "본문이")}
                    className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:underline cursor-pointer"
                  >
                    본문만 복사
                  </button>
                </div>
              </div>

              {/* 편집 모드 또는 뷰 모드 */}
              {isEditingContent ? (
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <textarea
                    rows={7}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full rounded-2xl border border-amber-300 bg-white p-3.5 text-sm md:text-base text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 font-sans leading-relaxed resize-y"
                    placeholder="수정할 본문 내용을 직접 입력하세요..."
                  />
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>* 문장이나 말투를 다듬은 후 [완료 및 반영 ✓]을 누르면 적용됩니다.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditedContent(currentPlan.content);
                        setIsEditingContent(false);
                      }}
                      className="text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
                    >
                      수정 취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-line text-sm md:text-base text-neutral-800 leading-relaxed font-sans pt-1">
                  {currentPlan.content}
                </div>
              )}

              <div className="pt-2 text-[11px] text-neutral-400 border-t border-neutral-200/40">
                💡 <strong>스레드 실전 떡상 팁:</strong> 본문에서는 상업적인 제품명을 숨겨 호기심을 극대화하고, 첫 번째 댓글(자댓글)로 제품명이나 링크를 연결하면 알고리즘 점수가 극대화됩니다.
              </div>
            </div>

            {/* 3. 마지막 댓글/CTA 박스 */}
            <div className="rounded-2xl bg-blue-50/70 border border-blue-200/70 p-4 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900 inline-flex items-center gap-1.5">
                  <span>💬 3. 마지막 댓글 / CTA (자댓글 유도 & 알고리즘 폭발)</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentPlan.cta, "댓글/CTA가")}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  복사하기
                </button>
              </div>
              <p className="text-sm md:text-base font-semibold text-blue-950">
                👉 {currentPlan.cta}
              </p>
              <p className="text-[11px] text-blue-600/80 mt-1">
                * 본문 마지막 줄에 덧붙이거나, 첫 번째 댓글(자댓글)로 바로 남겨 독자 참여를 유도하세요.
              </p>
            </div>

            {/* 4. 이어질 후속 콘텐츠 5개 */}
            {currentPlan.followUpIdeas && currentPlan.followUpIdeas.length > 0 && (
              <div className="rounded-2xl bg-neutral-50 border border-neutral-200/80 p-4 md:p-5 space-y-3">
                <div className="text-xs font-bold text-neutral-700 inline-flex items-center gap-1.5">
                  <span>💡 4. 이 글과 이어서 작성할 후속 콘텐츠 (5선)</span>
                </div>
                <ul className="space-y-2">
                  {currentPlan.followUpIdeas.map((idea, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs md:text-sm text-neutral-700 hover:text-neutral-900"
                    >
                      <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-neutral-800 text-[11px] font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug pt-0.5">{idea}</span>
                      <button
                        type="button"
                        onClick={() => handleSelectTopicAndGenerate(idea)}
                        className="text-[11px] text-neutral-400 hover:text-neutral-900 font-semibold underline ml-auto flex-shrink-0 cursor-pointer"
                      >
                        이 주제로 글 쓰기 →
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. 7종 "다시 써줘" 원클릭 리라이팅 영역 */}
            <div className="pt-6 border-t border-neutral-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <span>🔄</span>
                  <span>마음에 들 때까지 원클릭으로 다시 쓰기</span>
                </div>
                {isRewriting && (
                  <span className="text-xs font-semibold text-amber-600 animate-pulse">
                    ✨ {activeRewriteMode ? REWRITE_MODES.find(m => m.mode === activeRewriteMode)?.label : "수정"} 중...
                  </span>
                )}
              </div>

              {/* 7개 버튼 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {REWRITE_MODES.map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    disabled={isRewriting}
                    onClick={() => handleRewrite(item.mode)}
                    title={item.desc}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white p-2.5 text-center text-xs font-bold text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all active:scale-95 disabled:opacity-50 group cursor-pointer"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[11px] leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API 키 등록 유도 모달 */}
      {needApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 space-y-5 text-center shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              🔑
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-neutral-900">
                {missingProviderName || "AI"} API 키 등록이 필요합니다
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                선택하신 {missingProviderName || "AI"} 엔진으로 글을 생성하기 위해 회원 본인의 API 키를 등록해주세요.
                (엔진은 무료 제공되며, 연료는 본인 키를 사용합니다)
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href="/settings"
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white hover:bg-black transition-colors"
              >
                API키 등록하러 가기
              </a>
              <button
                type="button"
                onClick={() => setNeedApiKeyModal(false)}
                className="w-full rounded-xl py-2.5 text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
