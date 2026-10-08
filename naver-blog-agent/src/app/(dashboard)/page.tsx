"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  Layers,
  Zap,
  User,
  Tag,
  ArrowDown,
  Check,
  Wand2,
  Flame,
  Loader2,
  Download,
  Trash2,
  Maximize2,
  X,
  ImageIcon,
  SquarePen,
  BookOpen,
} from "lucide-react";
import BlogSmartEditorModal from "@/components/BlogSmartEditorModal";
import ContentRetentionNotice from "@/components/ContentRetentionNotice";
import { retentionDaysLeft } from "@/lib/retention";
import type { PipelineResult } from "@/lib/ai/pipeline";
import { BLOG_PERSONAS, type BlogPersona } from "@/types/persona";
import type { BlogViralCandidate } from "@/types/collector";
import { useContentCategories } from "@/hooks/useContentCategories";
import { WRITING_TONES, WRITING_STYLES, getWritingStyleExample, type WritingTone, type WritingStyle } from "@/lib/ai/writingStyles";
import {
  ENGINES,
  DEFAULT_ENGINE,
  IMAGE_PLATFORMS,
  IMAGE_MODELS,
  DEFAULT_IMAGE_MODELS,
  DEFAULT_IMAGE_PLATFORM,
  IMAGE_RATIOS,
  IMAGE_KEY_LABEL,
  findImageModel,
  type EngineProvider,
  type ImagePlatform,
  type ImageRatio,
} from "@/lib/ai/contentModels";

export default function MainPage() {
  const [activePersonaId, setActivePersonaId] = useState<string | null>("housewife");
  const [topic, setTopic] = useState("살림 9단이 직접 써보고 엄선한 삶의 질 수직상승 살림·가전 필수템 솔직 후기");
  const [category, setCategory] = useState("생활/살림꿀팁");
  const { categories: registeredCategories, loaded: categoriesLoaded } = useContentCategories();
  const [searchKeywords, setSearchKeywords] = useState("가전제품 비교, 살림 꿀팁, 세탁 노하우, 가성비 주방용품, 삶의 질 상승템");
  const [publishPurpose, setPublishPurpose] = useState("실제 주부 입장에서 가성비와 찐활용도를 꼼꼼하게 비교 분석하여 이웃들에게 추천");
  const [preferredTone, setPreferredTone] = useState<WritingTone>("해요체");
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("default");
  const [targetCharCount, setTargetCharCount] = useState<number>(2000);

  // AI 엔진 & 이미지 모델 선택 상태 (threads-content-ops와 동일 구조)
  const [engine, setEngine] = useState<{ provider: EngineProvider; model: string }>(DEFAULT_ENGINE);
  const [imageSettings, setImageSettings] = useState<{
    platform: ImagePlatform;
    model: string;
    ratio: ImageRatio;
    count: number;
  }>({
    platform: DEFAULT_IMAGE_PLATFORM,
    model: DEFAULT_IMAGE_MODELS[DEFAULT_IMAGE_PLATFORM],
    ratio: "1:1",
    count: 2,
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesNotice, setPreferencesNotice] = useState<string | null>(null);
  const [savedPreferences, setSavedPreferences] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState(false);
  const currentPreferences = JSON.stringify({
    textProvider: engine.provider,
    textModel: engine.model,
    imageModel: imageSettings.model,
    imageRatio: imageSettings.ratio,
    imageCount: imageSettings.count,
  });
  const preferencesUnchanged = savedPreferences === currentPreferences;
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<
    { url: string; type: "thumbnail" | "body"; caption: string; prompt: string }[]
  >([]);
  const [imageGenerating, setImageGenerating] = useState<{ done: number; total: number } | null>(null);
  const [singleGeneratingIndex, setSingleGeneratingIndex] = useState<number | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [generatingPersonaName, setGeneratingPersonaName] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<"smart" | "raw">("smart");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [savedPostCount, setSavedPostCount] = useState<number>(0);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // 계정 목록 불러오기
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState("");

  // 당해 연도(현재 2026년) 자동 정제 헬퍼
  const cleanCurrentYear = (text: string | null | undefined): string => {
    if (!text) return "";
    const currentYear = new Date().getFullYear();
    return text
      .replace(/202[0-5]년/g, `${currentYear}년`)
      .replace(/202[0-5](?=\s|[-_/.,;:!?)}\]>]|$)/g, `${currentYear}`);
  };

  // 수집된 떡상 글감 목록 & 현재 선택된 글감
  const [viralCandidates, setViralCandidates] = useState<BlogViralCandidate[]>([]);
  const [selectedViral, setSelectedViral] = useState<BlogViralCandidate | null>(null);

  const applyViralCandidate = (cand: BlogViralCandidate) => {
    setSelectedViral(cand);
    setTopic(cleanCurrentYear(cand.title));
    if (cand.category) setCategory(cand.category);
    if (cand.keywords && cand.keywords.length > 0) {
      setSearchKeywords(cand.keywords.map((k) => cleanCurrentYear(k)).join(", "));
    }
    const rawPurpose = cand.angle
      ? `${cand.angle} — ${cand.content.slice(0, 100)}`
      : cand.content.slice(0, 100);
    setPublishPurpose(cleanCurrentYear(rawPurpose));
  };

  const handleClearViral = () => {
    setSelectedViral(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem("nba_accounts_local");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAccounts(parsed);
        if (parsed.length > 0) {
          setSelectedBlogId(parsed[0].blog_id);
        }
      } catch {}
    }

    // 수집된 글감 로드 및 URL 쿼리 파라미터 연동
    try {
      const savedViral = localStorage.getItem("nba_viral_candidates");
      if (savedViral) {
        const parsedViral: BlogViralCandidate[] = JSON.parse(savedViral);
        if (Array.isArray(parsedViral)) {
          setViralCandidates(parsedViral);

          // URL 파라미터(?viralId=...&topic=...&category=...) 확인
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const viralId = params.get("viralId");
            const paramTopic = params.get("topic");
            const paramCategory = params.get("category");

            if (viralId) {
              const matched = parsedViral.find((c) => c.id === viralId);
              if (matched) {
                applyViralCandidate(matched);
              }
            } else if (paramTopic) {
              setTopic(cleanCurrentYear(decodeURIComponent(paramTopic)));
              if (paramCategory) setCategory(decodeURIComponent(paramCategory));
            }
          }
        }
      }
    } catch {}

    // 등록된 AI 및 이미지 키 목록 불러오기
    fetch("/api/keys")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.registered)) {
          setConfiguredProviders(data.registered);
        }
      })
      .catch(() => {});

    // 회원별 기본 AI 모델 설정을 불러옵니다. 등록값이 없으면 현재 기본값을 그대로 사용합니다.
    fetch("/api/generation-preferences", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error("저장된 모델 설정을 불러오지 못했습니다. 현재 선택값을 확인 후 저장해 주세요.");
        return data;
      })
      .then((data) => {
        const preferences = data?.preferences;
        if (!preferences) return;

        const savedEngine = ENGINES.find(
          (item) =>
            item.provider === preferences.textProvider &&
            item.models.some((model) => model.value === preferences.textModel)
        );
        if (savedEngine) {
          setEngine({ provider: savedEngine.provider, model: preferences.textModel });
        }

        const savedImage = findImageModel(preferences.imageModel);
        if (savedImage && IMAGE_RATIOS.some((ratio) => ratio.value === preferences.imageRatio)) {
          setImageSettings({
            platform: savedImage.platform,
            model: savedImage.value,
            ratio: preferences.imageRatio as ImageRatio,
            count: Math.min(5, Math.max(1, Number(preferences.imageCount) || 2)),
          });
        }
        if (savedEngine && savedImage) {
          setSavedPreferences(JSON.stringify({
            textProvider: savedEngine.provider,
            textModel: preferences.textModel,
            imageModel: savedImage.value,
            imageRatio: preferences.imageRatio,
            imageCount: preferences.imageCount,
          }));
        }
      })
      .catch((loadError: Error) => {
        setPreferencesError(true);
        setPreferencesNotice(loadError.message);
      })
      .finally(() => setPreferencesLoaded(true));

    // 서버 및 로컬 보관된 원고 목록 동기화 및 개수 확인
    fetch("/api/posts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.posts && Array.isArray(data.posts)) {
          setSavedPostCount(data.posts.length);
          localStorage.setItem("nba_saved_posts", JSON.stringify(data.posts));
        } else {
          const savedPosts = localStorage.getItem("nba_saved_posts");
          if (savedPosts) {
            const parsed = JSON.parse(savedPosts);
            if (Array.isArray(parsed)) setSavedPostCount(parsed.length);
          }
        }
      })
      .catch(() => {
        try {
          const savedPosts = localStorage.getItem("nba_saved_posts");
          if (savedPosts) {
            const parsed = JSON.parse(savedPosts);
            if (Array.isArray(parsed)) setSavedPostCount(parsed.length);
          }
        } catch {}
      });
  }, []);

  const saveGenerationPreferences = async () => {
    setPreferencesSaving(true);
    setPreferencesError(false);
    setPreferencesNotice(null);
    try {
      const res = await fetch("/api/generation-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: currentPreferences,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "기본 모델 설정을 저장하지 못했습니다.");
      setSavedPreferences(currentPreferences);
      setPreferencesNotice("기본 모델 설정을 저장했습니다. 다음 글 생성에도 자동 적용됩니다.");
    } catch (saveError: any) {
      setPreferencesError(true);
      setPreferencesNotice(saveError.message || "기본 모델 설정을 저장하지 못했습니다.");
    } finally {
      setPreferencesSaving(false);
    }
  };

  // 로컬 및 Supabase 서버 DB에 원고 영구 저장 및 갱신 헬퍼
  const savePostToStorage = async (
    postId: string,
    targetResult: PipelineResult,
    imagesToSave: any[],
    status: "draft" | "queued" = "draft"
  ) => {
    if (!targetResult || typeof window === "undefined") return;
    const finalImages = imagesToSave.length > 0 ? imagesToSave : targetResult.images || [];
    const postItem = {
      id: postId,
      blog_id: selectedBlogId || "myblog_sample",
      category_name: targetResult.category,
      title: targetResult.title,
      content: targetResult.content,
      excerpt: targetResult.excerpt || "",
      tags: targetResult.tags,
      images: finalImages,
      status,
      created_at: new Date().toISOString(),
    };

    // 1) 로컬 캐시 즉시 업데이트
    try {
      const existing: any[] = JSON.parse(localStorage.getItem("nba_saved_posts") || "[]");
      const existingIndex = existing.findIndex((p) => p.id === postId);
      let updatedList: any[];
      if (existingIndex >= 0) {
        updatedList = [...existing];
        updatedList[existingIndex] = {
          ...updatedList[existingIndex],
          ...postItem,
          created_at: updatedList[existingIndex].created_at || postItem.created_at,
        };
      } else {
        updatedList = [postItem, ...existing];
      }

      localStorage.setItem("nba_saved_posts", JSON.stringify(updatedList));
      setSavedPostCount(updatedList.length);
    } catch (err) {
      console.warn("로컬 원고 캐시 실패:", err);
    }

    // 2) Supabase DB 서버 영구 저장 (/api/posts)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postItem),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.post?.id && data.post.id !== postId) {
          setCurrentPostId(data.post.id);
        }
      }
    } catch (apiErr) {
      console.warn("서버 DB 영구 저장 중 오류 (로컬 보관 유지):", apiErr);
    }
  };

  // 과거 저장된 원고 불러오기
  const handleLoadSavedPost = (post: any) => {
    setCurrentPostId(post.id);
    setResult({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || "",
      tags: post.tags || [],
      category: post.category_name,
      images: post.images || [],
      stepsLog: [
        { step: "보관함 로드", status: "done", message: "저장된 원고 데이터를 성공적으로 복원했습니다." },
      ],
    });
    if (Array.isArray(post.images)) {
      setGeneratedImages(post.images);
    }
    setIsHistoryModalOpen(false);
    setTimeout(() => {
      const el = document.getElementById("result-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSelectBlogAccount = (blogId: string) => {
    setSelectedBlogId(blogId);
  };

  const handleSelectRegisteredCategory = (categoryId: string) => {
    const selected = registeredCategories.find((c) => c.id === categoryId);
    if (!selected) return;
    setCategory(selected.name);
  };

  // 페르소나 클릭 시 조건 자동 세팅
  const handleSelectPersona = (p: BlogPersona) => {
    setActivePersonaId(p.id);
    setTopic(p.defaultTopic);
    setSearchKeywords(p.defaultKeywords);
    setPublishPurpose(p.defaultPurpose);
  };

  // 페르소나 카드의 [⚡ 즉시 생성] 클릭 시
  const handleGenerateWithPersona = async (p: BlogPersona) => {
    handleSelectPersona(p);
    setGeneratingPersonaName(p.name);
    await executeGeneration({
      overrideTopic: topic.trim() || p.defaultTopic,
      overrideCategory: category || p.defaultCategory,
      overrideKeywords: p.defaultKeywords,
      overridePurpose: p.defaultPurpose,
      overrideTone: preferredTone,
      overridePersona: p,
    });
    setGeneratingPersonaName(null);
  };

  // 폼 제출 시 생성
  const handleGenerateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const activePersona = BLOG_PERSONAS.find((p) => p.id === activePersonaId);
    await executeGeneration({
      overrideTopic: topic.trim() || undefined,
      overrideCategory: category,
      overrideKeywords: searchKeywords,
      overridePurpose: publishPurpose,
      overrideTone: preferredTone,
      overridePersona: activePersona,
    });
  };

  // 공통 생성 실행 함수
  const executeGeneration = async (params: {
    overrideTopic?: string;
    overrideCategory: string;
    overrideKeywords?: string;
    overridePurpose?: string;
    overrideTone: string;
    overridePersona?: BlogPersona;
  }) => {
    if (!preferencesLoaded) {
      setError("저장된 기본 모델을 불러오는 중입니다. 잠시 뒤 생성해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setNeedKey(false);
    setResult(null);
    setGeneratedImages([]); // 새 글 생성 시 기존 생성 이미지 초기화

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: cleanCurrentYear(params.overrideTopic) || undefined,
          category: params.overrideCategory,
          searchKeywords: cleanCurrentYear(params.overrideKeywords),
          publishPurpose: cleanCurrentYear(params.overridePurpose),
          preferredTone: params.overrideTone,
          writingStyle,
          targetLength: targetCharCount,
          engine, // 선택한 AI 글 생성 엔진 & 세부 모델 전달!
          persona: params.overridePersona
            ? {
                id: params.overridePersona.id,
                name: params.overridePersona.name,
                badge: params.overridePersona.badge,
                tonePrompt: params.overridePersona.tonePrompt,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needKey) setNeedKey(true);
        throw new Error(data.error || "글 생성 실패");
      }

      const newPostId = "post-" + Date.now();
      setCurrentPostId(newPostId);
      setResult(data.result);
      // 생성 완료 즉시 로컬 원고 보관함에 자동 저장
      savePostToStorage(newPostId, data.result, [], "draft");

      // 글 생성이 완료되면 해당 글감을 사용 완료(used) 상태로 업데이트
      if (selectedViral) {
        try {
          const saved = localStorage.getItem("nba_viral_candidates");
          if (saved) {
            const list: BlogViralCandidate[] = JSON.parse(saved);
            const updated = list.map((c) =>
              c.id === selectedViral.id ? { ...c, status: "used" as const } : c
            );
            localStorage.setItem("nba_viral_candidates", JSON.stringify(updated));
            setViralCandidates(updated);
            setSelectedViral((prev) => (prev ? { ...prev, status: "used" } : null));
          }
        } catch {}
      }

      // 결과 화면으로 부드럽게 스크롤 이동
      setTimeout(() => {
        const el = document.getElementById("result-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);

      // ★ [본문 + 이미지 원클릭 동시 생성]: 본문 작성이 완료되면 곧바로 추천 이미지 컷 자동 생성 연동!
      if (data.result && Array.isArray(data.result.images) && data.result.images.length > 0) {
        generateImagesFor(data.result);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // AI 이미지 자동 생성 공통 실행기
  const generateImagesFor = async (targetResult: PipelineResult) => {
    if (!targetResult || imageGenerating) return;
    const promptsToUse = targetResult.images || [];
    const countToGenerate = Math.min(imageSettings.count, Math.max(promptsToUse.length, 1));
    setImageGenerating({ done: 0, total: countToGenerate });
    setError(null);
    const newlyCollected: { url: string; type: "thumbnail" | "body"; caption: string; prompt: string }[] = [];

    try {
      for (let i = 0; i < countToGenerate; i++) {
        const baseItem = promptsToUse[i] || {
          prompt: `High quality detailed blog photo about ${targetResult.title}, ${targetResult.category}, photorealistic, natural lighting, no text`,
          caption: `${i === 0 ? "대표 썸네일" : "본문 상세 컷 " + i}`,
          type: (i === 0 ? "thumbnail" : "body") as "thumbnail" | "body",
        };

        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: baseItem.prompt,
            imageModel: imageSettings.model,
            ratio: imageSettings.ratio,
            caption: baseItem.caption,
            type: baseItem.type,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.needKey) setNeedKey(true);
          console.warn(`${i + 1}번째 이미지 생성 실패:`, data.error);
          continue;
        }

        const newImg = {
          url: data.url,
          type: data.type,
          caption: data.caption,
          prompt: data.prompt,
        };
        newlyCollected.push(newImg);

        setGeneratedImages((prev) => {
          // 중복 방지
          const filtered = prev.filter((img) => img.caption !== data.caption);
          return [...filtered, newImg];
        });
        setImageGenerating({ done: i + 1, total: countToGenerate });
      }

      // 이미지 생성 완료 후 보관함 원고에 최신 이미지 목록 자동 갱신 저장
      if (newlyCollected.length > 0) {
        const targetId = currentPostId || "post-" + Date.now();
        savePostToStorage(targetId, targetResult, newlyCollected, "draft");
      }
    } catch (err: any) {
      console.error("이미지 생성 중 오류:", err);
    } finally {
      setImageGenerating(null);
    }
  };

  // AI 이미지 일괄 생성 핸들러 (수동 클릭 시)
  const handleGenerateImages = async () => {
    if (!result || imageGenerating) return;
    setGeneratedImages([]); // 기존 것 초기화 후 재생성
    await generateImagesFor(result);
  };

  // 특정 컷 단일 이미지 생성 핸들러
  const handleGenerateSingleImage = async (
    index: number,
    item: { prompt: string; caption: string; type: "thumbnail" | "body" }
  ) => {
    if (singleGeneratingIndex !== null || imageGenerating) return;
    setSingleGeneratingIndex(index);
    setError(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: item.prompt,
          imageModel: imageSettings.model,
          ratio: imageSettings.ratio,
          caption: item.caption,
          type: item.type,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needKey) setNeedKey(true);
        throw new Error(data.error || "이미지 생성 실패");
      }

      setGeneratedImages((prev) => [
        ...prev,
        {
          url: data.url,
          type: data.type,
          caption: data.caption,
          prompt: data.prompt,
        },
      ]);
    } catch (err: any) {
      alert(err.message || "이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setSingleGeneratingIndex(null);
    }
  };

  const handleRemoveGeneratedImage = (targetIndex: number) => {
    setGeneratedImages((prev) => prev.filter((_, idx) => idx !== targetIndex));
  };

  const handlePublishToQueue = () => {
    if (!result) return;
    const finalImagesToSave = generatedImages.length > 0 ? generatedImages : result.images;
    const targetId = currentPostId || "post-" + Date.now();
    savePostToStorage(targetId, result, finalImagesToSave, "queued");
    alert("크롬 확장의 자동 발행 큐에 등록되었습니다! 크롬 브라우저가 열려 있으면 스마트에디터 ONE에 직접 타이핑 및 이미지 첨부를 시작합니다.");
  };

  const handleSaveDraft = () => {
    if (!result) return;
    const finalImagesToSave = generatedImages.length > 0 ? generatedImages : result.images;
    const targetId = currentPostId || "post-" + Date.now();
    savePostToStorage(targetId, result, finalImagesToSave, "draft");
    alert("보관함에 원고가 안전하게 저장되었습니다.");
  };

  const copyContent = () => {
    if (!result) return;
    let formatted = result.content;
    let bodySlotIndex = 1;
    // [IMAGE INSERT - ...] 위치를 생성된 실제 이미지 URL 마크다운으로 치환
    formatted = formatted.replace(/\[IMAGE INSERT\s*-\s*([^\]]+)\]/g, (match, desc) => {
      const img = generatedImages[bodySlotIndex] || generatedImages.find((item) => item.type === "body");
      bodySlotIndex++;
      if (img?.url) {
        return `\n\n![${img.caption || desc}](${img.url})\n\n`;
      }
      return match;
    });

    const thumbImg = generatedImages[0]?.url ? `![${result.title} 대표 썸네일](${generatedImages[0].url})\n\n` : "";
    const full = `# ${result.title}\n\n${thumbImg}${formatted}\n\n태그: ${result.tags.map((t) => "#" + t).join(" ")}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 스마트 에디터에서 편집 완료 시 호출되는 핸들러
  const handleSaveEditedContent = (updated: {
    title: string;
    content: string;
    excerpt: string;
    tags: string[];
    category?: string;
    isHtml: boolean;
  }) => {
    if (!result) return;
    setResult({
      ...result,
      title: updated.title,
      content: updated.content,
      excerpt: updated.excerpt,
      tags: updated.tags,
      category: updated.category || result.category,
    });
    if (updated.category) {
      setCategory(updated.category);
    }
    alert("스마트 에디터에서 편집된 원고가 본문에 성공적으로 적용되었습니다!");
  };

  // 스마트에디터 본문 인라인 렌더링 헬퍼 (소제목 서식화 및 [IMAGE INSERT] 실제 이미지 치환)
  const renderSmartArticle = (content: string) => {
    if (!content) return null;

    // 만약 위지윅 에디터에서 편집된 HTML 콘텐츠인 경우 prose 스타일로 렌더링
    const isHtmlContent = /<(p|h1|h2|h3|img|div|ul|ol|table|blockquote)[^>]*>/i.test(content);
    if (isHtmlContent) {
      return (
        <div
          className="prose max-w-none text-sm sm:text-base text-neutral-800 leading-relaxed font-sans space-y-3"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let currentParagraphLines: string[] = [];
    let bodySlotIndex = 0; // 본문 내 [IMAGE INSERT] 출현 순서

    const flushParagraph = (key: string) => {
      if (currentParagraphLines.length > 0) {
        const text = currentParagraphLines.join("\n").trim();
        if (text) {
          elements.push(
            <p key={key} className="text-sm sm:text-base text-neutral-800 leading-relaxed whitespace-pre-line font-normal my-3">
              {text}
            </p>
          );
        }
        currentParagraphLines = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // 1. [SECTION - ...] 스마트에디터 소제목
      if (trimmed.startsWith("[SECTION") && trimmed.endsWith("]")) {
        flushParagraph(`p-before-sec-${idx}`);
        const secTitle = trimmed.replace(/^\[SECTION\s*-\s*/, "").replace(/\]$/, "");
        elements.push(
          <div key={`sec-${idx}`} className="pt-4 pb-1 border-b border-neutral-200 my-4">
            <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 flex items-center gap-2">
              <span className="text-emerald-600 font-black">📌</span>
              <span>{secTitle}</span>
            </h3>
          </div>
        );
        return;
      }

      // 2. [IMAGE INSERT - ...] 인라인 이미지 삽입 위치
      if (trimmed.startsWith("[IMAGE INSERT") && trimmed.endsWith("]")) {
        flushParagraph(`p-before-img-${idx}`);
        const imgDesc = trimmed.replace(/^\[IMAGE INSERT\s*-\s*/, "").replace(/\]$/, "");
        bodySlotIndex++;
        const targetSlot = bodySlotIndex; // 1, 2, ...
        // 매칭 이미지: index 0은 썸네일, 본문 컷은 targetSlot (1번째 본문 컷 = index 1)
        const matchedImage = generatedImages[targetSlot] || (bodySlotIndex === 1 ? generatedImages.find((img) => img.type === "body") : undefined);
        const promptItem = result?.images?.[targetSlot] || result?.images?.find((p) => p.type === "body") || result?.images?.[0];

        if (matchedImage && matchedImage.url) {
          elements.push(
            <figure key={`img-slot-${idx}`} className="my-5 rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-xs group cursor-zoom-in">
              <div onClick={() => setViewingImageUrl(matchedImage.url)} className="relative overflow-hidden">
                <img
                  src={matchedImage.url}
                  alt={matchedImage.caption || imgDesc}
                  className="w-full max-h-[460px] object-cover group-hover:scale-[1.01] transition-transform duration-200"
                />
                <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  클릭하여 원본 확대
                </div>
              </div>
              <figcaption className="text-center text-xs text-neutral-500 py-2.5 font-medium bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-center gap-1.5">
                <span>📷 {matchedImage.caption || imgDesc}</span>
              </figcaption>
            </figure>
          );
        } else {
          elements.push(
            <div key={`img-slot-${idx}`} className="my-4 p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-blue-900">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>본문 이미지 삽입 위치 (본문 컷 #{bodySlotIndex})</span>
                </div>
                <p className="text-xs text-neutral-600 font-medium">{imgDesc}</p>
              </div>
              {promptItem && (
                <button
                  type="button"
                  onClick={() => handleGenerateSingleImage(targetSlot, promptItem)}
                  disabled={imageGenerating !== null || singleGeneratingIndex !== null}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {singleGeneratingIndex === targetSlot ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>이 위치 이미지 생성</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        }
        return;
      }

      currentParagraphLines.push(line);
    });

    flushParagraph("p-last");
    return elements;
  };

  const selectedRegisteredCategory = registeredCategories.find((c) => c.name === category);

  return (
    <div className="space-y-6">
      {/* 1. 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              5단계 AI 파이프라인
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-500">네이버 C-Rank & DIA+ 알고리즘 최적화</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
            네이버 블로그 원고 자동 생성
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            6대 상황별 페르소나를 선택하거나 맞춤 기획 조건을 입력하면, 리서치부터 휴머나이저 윤문, 스마트에디터 서식 생성까지 100% 자동 완성됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/queue"
            className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 shadow-2xs flex items-center gap-1.5 transition-all"
            title="생성된 모든 원고와 이미지가 보관된 목록으로 이동"
          >
            <BookOpen size={14} className="text-emerald-600" />
            <span>📑 생성 원고 보관함</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              {savedPostCount}건
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="최근 저장된 원고 목록에서 선택해 다시 열기"
          >
            <span>최근 원고 열기</span>
          </button>
        </div>
      </div>

      {needKey && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>AI API 키(OpenAI, Gemini, Claude)가 등록되지 않았습니다. 먼저 등록해주세요.</span>
          </div>
          <Link
            href="/settings"
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
          >
            API 키 등록하기
          </Link>
        </div>
      )}

      {/* 2. 상단 섹션: 페르소나 선택 & 기획 조건 설정 (전체 폭) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-6">
        
        {/* 2-0. [🔥 수집한 떡상 글감에서 선택하기] 섹션 */}
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white font-bold text-xs shadow-xs">
                🔥
              </span>
              <div>
                <span className="text-sm md:text-base font-extrabold text-neutral-900">
                  수집한 떡상 글감에서 선택하기
                </span>
                <span className="ml-2 rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[11px] font-bold">
                  {viralCandidates.length}건 보관
                </span>
              </div>
            </div>

            <Link
              href="/collector"
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 transition-colors"
            >
              <span>+ 새 글감 수집하러 가기</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {selectedViral ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white p-3.5 border border-rose-300 shadow-xs">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded bg-rose-600 text-white font-bold px-2 py-0.5 text-[10px]">
                    적용 중인 떡상 글감
                  </span>
                  <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    {selectedViral.category}
                  </span>
                  {selectedViral.status === "used" && (
                    <span className="rounded bg-sky-50 text-sky-700 px-1.5 py-0.5 text-[10px] font-medium">
                      발행 완료됨
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 text-sm md:text-base font-bold text-neutral-900 truncate">
                  {selectedViral.title}
                </h3>
                {selectedViral.angle && (
                  <p className="mt-1 text-xs text-amber-800 truncate">
                    공략 앵글: {selectedViral.angle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClearViral}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  선택 해제
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  aria-label="수집된 떡상 글감 선택"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs md:text-sm font-medium text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  value=""
                  onChange={(e) => {
                    const found = viralCandidates.find((c) => c.id === e.target.value);
                    if (found) applyViralCandidate(found);
                  }}
                >
                  <option value="">
                    {viralCandidates.length > 0
                      ? "-- 보관된 떡상 글감 목록에서 선택 (클릭 시 주제·카테고리·키워드 즉시 세팅) --"
                      : "-- 아직 수집된 글감이 없습니다. 우측 상단에서 새 글감을 수집해 보세요 --"}
                  </option>
                  {viralCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.category}] {c.title} ({c.status === "used" ? "발행완료" : "사용가능"})
                    </option>
                  ))}
                </select>
              </div>

              {/* 빠른 선택 칩 */}
              {viralCandidates.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-bold text-neutral-500 mr-0.5">빠른 선택:</span>
                  {viralCandidates.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => applyViralCandidate(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:border-rose-400 hover:bg-rose-50/70 hover:text-rose-900 transition-all truncate max-w-[260px]"
                    >
                      <span className="truncate">{c.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2-1. [글의 화자(페르소나) 원클릭 선택] 섹션 */}
        <div className="space-y-3 pb-6 border-b border-neutral-100">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎭</span>
              <span className="text-sm md:text-base font-extrabold text-neutral-900">
                글의 화자 (페르소나) 선택
              </span>
              <span className="text-xs font-semibold text-neutral-500 hidden sm:inline">
                (글을 작성하는 주인공·화자의 시각·말투·경험 캐릭터를 설정합니다)
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
              <span>화자 맞춤형 자동 작성</span>
            </span>
          </div>

          {/* 6대 페르소나 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BLOG_PERSONAS.map((p) => {
              const isSelected = activePersonaId === p.id;
              const isThisGenerating = loading && generatingPersonaName === p.name;

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPersona(p)}
                  className={`text-left rounded-2xl border p-4 transition-all group flex flex-col justify-between cursor-pointer active:scale-[0.99] shadow-xs relative ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-md"
                      : "border-neutral-200 bg-neutral-50/60 hover:bg-white hover:border-neutral-400 text-neutral-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="flex items-center gap-1.5 font-bold text-sm text-neutral-900">
                        <span className="text-base">{p.emoji}</span>
                        <span>{p.name}</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {p.badge}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 leading-snug line-clamp-2 mt-1">
                      {p.tagline}
                    </p>

                    <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1">
                      <span className="text-neutral-500 font-medium shrink-0">추천 주제:</span>
                      <span className="truncate text-neutral-700">{p.defaultTopic}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-200/70 flex items-center justify-between text-xs">
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        isSelected ? "text-emerald-700 font-bold" : "text-neutral-500 group-hover:text-neutral-900"
                      }`}
                    >
                      {isSelected ? "✓ 선택됨" : "조건 불러오기"}
                    </span>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateWithPersona(p);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs ${
                        isSelected
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-neutral-900 text-white hover:bg-neutral-800"
                      }`}
                      title="이 페르소나로 즉시 5단계 글 생성 시작"
                    >
                      {isThisGenerating ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>작성 중...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          <span>즉시 생성 →</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2-2. [🎯 원하는 글자수 생성 설정 (1 ~ 4,000자)] 섹션 */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
                📏
              </span>
              <div>
                <span className="text-sm md:text-base font-extrabold text-neutral-900">
                  원하는 글자수 생성 설정
                </span>
                <span className="ml-2 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-bold">
                  1 ~ 4,000자 범위 설정
                </span>
              </div>
            </div>

            {/* 현재 설정된 글자수 뱃지 및 직접 숫자 입력 */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-neutral-600 font-semibold">목표 글자수:</span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-neutral-900 px-3 py-1 text-sm font-black text-white shadow-xs">
                {targetCharCount.toLocaleString()}자
              </span>
              <div className="flex items-center rounded-xl border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-800 shadow-2xs">
                <input
                  type="number"
                  min="1"
                  max="4000"
                  value={targetCharCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1 && val <= 4000) setTargetCharCount(val);
                  }}
                  className="w-14 text-right font-bold focus:outline-none"
                />
                <span className="ml-1 text-neutral-400 font-medium">자</span>
              </div>
            </div>
          </div>

          {/* 슬라이더 바 트랙 */}
          <div className="space-y-1.5 pt-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min="1"
                max="4000"
                step="50"
                value={targetCharCount}
                onChange={(e) => setTargetCharCount(Number(e.target.value))}
                className="w-full h-3 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none transition-all"
              />
            </div>

            {/* 주요 눈금 가이드 */}
            <div className="flex justify-between text-[11px] font-semibold text-neutral-400 px-1">
              <span>1자</span>
              <span>1,000자</span>
              <span className="font-bold text-emerald-700">2,000자 (추천 표준)</span>
              <span>3,000자</span>
              <span>4,000자 (최대)</span>
            </div>
          </div>

          {/* 구간별 성격 안내 및 빠른 선택 버튼 */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60">
            <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
              <span>
                {targetCharCount <= 800
                  ? "💡 [초단문 요약] 인스타·카드뉴스 연동형 퀵 요약 (단락 1~2개)"
                  : targetCharCount <= 1500
                  ? "💡 [단문 리뷰] 가벼운 일상·제품 퀵 리뷰·빠른 정보 전달 (소제목 2~3개)"
                  : targetCharCount <= 2500
                  ? "💡 [네이버 블로그 표준] C-Rank / DIA+ 검색 상위 노출 황금 분량 (소제목 3~4개)"
                  : targetCharCount <= 3500
                  ? "💡 [전문 심층 분석] 독자 체류시간 극대화, 상세 팩트체크 및 비교 가이드 (소제목 4~5개)"
                  : "💡 [초대형 완벽 가이드] 분야별 총정리 완벽 백과사전 가이드 (소제목 5개 이상)"}
              </span>
            </div>

            {/* 빠른 프리셋 버튼들 */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-neutral-500 font-bold mr-0.5">빠른 선택:</span>
              {[
                { label: "1,000자", val: 1000 },
                { label: "1,800자 (기본)", val: 1800 },
                { label: "2,000자 (추천)", val: 2000 },
                { label: "2,500자 (상위)", val: 2500 },
                { label: "3,500자 (심층)", val: 3500 },
                { label: "4,000자 (최대)", val: 4000 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setTargetCharCount(preset.val)}
                  className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                    targetCharCount === preset.val
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2-3. 기획 조건 직접 설정 및 미세 조정 폼 */}
        <form onSubmit={handleGenerateForm} className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>기획 세부 조건 미세 조정</span>
            </h2>
            <span className="text-xs text-neutral-400">
              페르소나 선택 시 자동 입력되며, 자유롭게 수정할 수 있습니다.
            </span>
          </div>

          {/* 블로그 계정 및 등록 카테고리 빠른 선택 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 계정 선택 */}
            {accounts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-neutral-700">
                    발행할 네이버 블로그 ID
                  </label>
                  <Link
                    href="/accounts"
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    계정·카테고리 설정 ↗
                  </Link>
                </div>
                <select
                  value={selectedBlogId}
                  onChange={(e) => handleSelectBlogAccount(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.blog_id}>
                      {acc.label} ({acc.blog_id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 카테고리 & 특정 주제 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="generation-category" className="block text-[11px] font-semibold text-neutral-700 mb-1">
                카테고리 선택
              </label>
              <select
                id="generation-category"
                aria-describedby="generation-category-help"
                value={selectedRegisteredCategory?.id || ""}
                onChange={(e) => handleSelectRegisteredCategory(e.target.value)}
                disabled={loading || !categoriesLoaded || registeredCategories.length === 0}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500"
              >
                <option value="" disabled>
                  {!categoriesLoaded
                    ? "카테고리 목록을 불러오는 중입니다"
                    : registeredCategories.length === 0
                      ? "등록된 카테고리가 없습니다"
                      : "등록된 카테고리를 선택하세요"}
                </option>
                {registeredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p id="generation-category-help" className="mt-1.5 text-[11px] text-neutral-500">
                콘텐츠 보관함·글감 수집소와 같은 분류 목록입니다. 검색 키워드와 발행 목적은 유지됩니다. <Link href="/queue" className="text-emerald-600 hover:underline">카테고리 관리 ↗</Link>
                {categoriesLoaded && registeredCategories.length === 0 && <span className="block mt-1">보관함에서 콘텐츠 카테고리를 등록해 주세요.</span>}
                {!selectedRegisteredCategory && category && (
                  <span className="block mt-1">현재 기획 카테고리: {category} (등록 목록 외 값). 등록된 항목을 선택하면 교체됩니다.</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                특정 주제 (비워두면 페르소나 및 트렌드로 자동 발굴)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 2026 청년 취업지원금 신청 절차"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          {/* 검색 키워드 & 발행 목적 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                검색 키워드 (쉼표 구분)
              </label>
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                placeholder="예: 정부지원금, 일상 꿀팁, 절약 노하우"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                발행 목적 및 독자 타깃
              </label>
              <input
                type="text"
                value={publishPurpose}
                onChange={(e) => setPublishPurpose(e.target.value)}
                placeholder="예: 사회초년생을 위한 실전 복지 혜택 가이드"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <fieldset disabled={loading} className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 space-y-4 disabled:opacity-70">
            <legend className="px-2 text-sm font-bold text-neutral-900">원고 말끝·문체 설정</legend>
            <p className="text-xs text-neutral-500">페르소나는 글의 화자입니다. 말끝과 문체는 별도로 선택하며, 페르소나·카테고리를 바꿔도 선택값을 유지합니다.</p>
            <div>
              <p className="text-xs font-semibold text-neutral-700 mb-2">말끝 선택</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="말끝 선택">
                {WRITING_TONES.map((tone) => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => setPreferredTone(tone.value)}
                    aria-pressed={preferredTone === tone.value}
                    title={tone.description}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all ${
                      preferredTone === tone.value
                        ? "bg-neutral-900 text-white border-neutral-900 font-bold"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {tone.value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-700 mb-2">문체 선택</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="문체 선택">
                {WRITING_STYLES.map((style) => (
                  <button key={style.value} type="button" aria-pressed={writingStyle === style.value}
                    onClick={() => setWritingStyle(style.value)}
                    className={`min-w-0 rounded-lg border p-3 text-left transition-colors ${writingStyle === style.value ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}>
                    <span className="block text-xs font-bold">{style.label}</span>
                    <span className="mt-1 block text-[11px]">{style.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700" aria-live="polite">
              <p className="font-semibold">표현 예시 · {preferredTone} + {WRITING_STYLES.find((s) => s.value === writingStyle)?.label}</p>
              <p className="mt-1 leading-relaxed">{getWritingStyleExample(preferredTone, writingStyle)}</p>
              <p className="mt-2 text-[11px] text-neutral-500">문체 차이를 보여주는 예시입니다. 실제 원고는 입력한 주제로 작성하며 경험·후기·수치를 지어내지 않습니다.</p>
            </div>
          </fieldset>
          <div className="pt-2 flex justify-end border-t border-neutral-100">
            <button
              type="submit"
              disabled={loading || !preferencesLoaded}
              className="py-3 px-6 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 min-w-[240px]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>5단계 AI 에이전트 작업 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{preferencesLoaded ? "5단계 AI 블로그 글 생성 시작" : "기본 모델 설정 불러오는 중..."}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <section aria-labelledby="generation-model-settings" className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 id="generation-model-settings" className="text-base font-bold text-neutral-900">AI 글·이미지 생성 기본 모델 설정</h2>
          <p className="mt-1 text-xs text-neutral-500">선택한 모델로 글과 이미지를 생성합니다. 기본값으로 저장하면 다음 접속에도 그대로 적용됩니다.</p>
        </div>
        <fieldset disabled={!preferencesLoaded || preferencesSaving} className="min-w-0 space-y-4 disabled:opacity-70">
          {/* 2-4. [🤖 AI 글 생성 엔진 선택] 카드 (threads-content-ops와 동일 구조) */}
          {(() => {
            const engineInfo = ENGINES.find((item) => item.provider === engine.provider) ?? ENGINES[0];
            const engineKeyReady = configuredProviders.includes(engine.provider);
            const imagePlatform = IMAGE_PLATFORMS.find((item) => item.id === imageSettings.platform) ?? IMAGE_PLATFORMS[0];
            const imageKeyReady = configuredProviders.includes(imagePlatform.keyProvider);

            return (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-emerald-300 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>🤖 AI 글 생성 엔진 선택</span>
                      <span className="hidden font-normal text-neutral-500 sm:inline text-xs">(GPT / Claude / Gemini)</span>
                    </p>
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      5단계 파이프라인 전체 적용
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {ENGINES.map((item) => {
                      const isPicked = engine.provider === item.provider;
                      const hasKey = configuredProviders.includes(item.provider);
                      return (
                        <button
                          key={item.provider}
                          type="button"
                          onClick={() => setEngine({ provider: item.provider, model: item.models[0].value })}
                          aria-pressed={isPicked}
                          className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2.5 text-center font-bold transition-all ${
                            isPicked ? "border-emerald-600 bg-emerald-600 text-white shadow-xs" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span className="text-sm font-extrabold tracking-tight">{item.label}</span>
                          <span className="text-[10px] font-normal opacity-80">
                            {item.sub}
                            {hasKey ? "" : " · 키 미등록"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <label className="block border-t border-neutral-100 pt-2 text-[11px] font-bold text-neutral-700">
                    🎯 {engineInfo.label} 세부 실행 모델
                    <select
                      className="w-full mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                      value={engine.model}
                      onChange={(e) => setEngine({ ...engine, model: e.target.value })}
                    >
                      {engineInfo.models.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!engineKeyReady && (
                    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-700" />
                      <span>
                        {engineInfo.label} API 키가 등록되지 않았습니다.{" "}
                        <Link className="font-semibold underline" href="/settings">
                          API키등록·플랫폼연동
                        </Link>
                        에서 본인 키를 저장하거나 다른 엔진을 선택해 주세요.
                      </span>
                    </p>
                  )}
                </div>

                {/* 2-5. [🖼️ 이미지 생성 모델 설정] 카드 (4대 플랫폼) */}
                <div className="rounded-xl border-2 border-fuchsia-300 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>🖼️ 이미지 생성 모델 설정</span>
                      <span className="hidden font-normal text-neutral-500 sm:inline text-xs">(NanoBanana · GPT Image · FLUX · Z-Image)</span>
                    </p>
                    <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      하단 결과의 파란색 [AI 이미지 생성]에 적용
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {IMAGE_PLATFORMS.map((item) => {
                      const isPicked = imageSettings.platform === item.id;
                      const hasKey = configuredProviders.includes(item.keyProvider);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setImageSettings({
                              ...imageSettings,
                              platform: item.id,
                              model: DEFAULT_IMAGE_MODELS[item.id],
                            })
                          }
                          aria-pressed={isPicked}
                          className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-2.5 text-center font-bold transition-all ${
                            isPicked ? "border-blue-600 bg-blue-600 text-white shadow-xs" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span className="text-xs font-extrabold tracking-tight">{item.name}</span>
                          <span className="text-[10px] font-normal opacity-80">
                            {item.sub}
                            {hasKey ? "" : " · 키 미등록"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 border-t border-neutral-100 pt-2 sm:grid-cols-[1fr_auto_auto]">
                    <label className="block min-w-0 text-[11px] font-bold text-neutral-700">
                      🎯 {imagePlatform.name} 세부 실행 모델
                      <select
                        className="w-full mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                        value={imageSettings.model}
                        onChange={(e) => setImageSettings({ ...imageSettings, model: e.target.value })}
                      >
                        {IMAGE_MODELS.filter((item) => item.platform === imageSettings.platform).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-[11px] font-bold text-neutral-700">
                      📐 비율
                      <select
                        className="w-full mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                        value={imageSettings.ratio}
                        onChange={(e) => setImageSettings({ ...imageSettings, ratio: e.target.value as ImageRatio })}
                      >
                        {IMAGE_RATIOS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-[11px] font-bold text-neutral-700">
                      🔢 생성 장수
                      <select
                        className="w-full mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                        value={imageSettings.count}
                        onChange={(e) => setImageSettings({ ...imageSettings, count: Number(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map((num) => (
                          <option key={num} value={num}>
                            {num}장 {num === 2 ? "(썸네일+본문 기본)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <p className="text-[11px] text-neutral-500">
                    💡 사람이 등장할 경우 항상 한국인/동아시아인으로 생성하며, 이미지 내 글자·워터마크를 넣지 않고 깔끔한 실사로 만듭니다.
                  </p>

                  {!imageKeyReady && (
                    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-700" />
                      <span>
                        {IMAGE_KEY_LABEL[imagePlatform.keyProvider]} API 키가 등록되지 않았습니다.{" "}
                        <Link className="font-semibold underline" href="/settings">
                          API키등록·플랫폼연동
                        </Link>
                        에서 본인 키를 저장하거나 다른 플랫폼을 선택해 주세요.
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </fieldset>
                  <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] text-neutral-500">
                      {!preferencesLoaded
                        ? "회원님의 저장된 기본 모델을 불러오는 중입니다."
                        : preferencesUnchanged
                          ? "현재 글·이미지 모델 설정이 기본값으로 저장되어 있습니다."
                          : "현재 선택값으로 생성됩니다. 계속 사용하려면 기본 모델 설정을 저장해 주세요."}
                    </p>
                    <button
                      type="button"
                      onClick={saveGenerationPreferences}
                      disabled={!preferencesLoaded || preferencesSaving}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                      {preferencesSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {preferencesSaving ? "저장 중" : "기본 모델 설정 저장"}
                    </button>
                  </div>

                  {preferencesNotice && (preferencesError || preferencesUnchanged) && (
                    <p
                      role="status"
                      className={`rounded-lg px-3 py-2 text-xs font-medium ${
                        preferencesError
                          ? "border border-rose-200 bg-rose-50 text-rose-800"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {preferencesNotice}
                    </p>
                  )}

      </section>

      {/* 3. 하단 섹션: AI 생성 결과물 보이는 섹션 (결과물 보이는 섹션을 아래로 이동) */}
      <div id="result-section" className="space-y-4 pt-2">
        {error && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">오류 발생</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {result ? (
          <>
            <ContentRetentionNotice />
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
            {/* 상단 컨트롤 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {result.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>보관함 자동 저장됨</span>
                </span>
                {result.personaName && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-700">
                    🎭 {result.personaName} 관점
                  </span>
                )}
                {result.preferredTone && result.writingStyle && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-700">
                    {result.preferredTone} · {WRITING_STYLES.find((s) => s.value === result.writingStyle)?.label || "기본"}
                  </span>
                )}
                <span className="text-xs text-neutral-400">·</span>
                <span className="text-xs text-neutral-700 font-semibold bg-neutral-100 px-2 py-0.5 rounded">
                  공백 포함 약 {result.content.length.toLocaleString()}자 (목표: {(result.targetLength || targetCharCount).toLocaleString()}자)
                </span>
                <span className="text-[11px] text-neutral-400">
                  (공백 제외 {result.content.replace(/\s/g, "").length.toLocaleString()}자)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyContent}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? "복사 완료!" : "원고 복사"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-extrabold text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <SquarePen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>✏️ 스마트 에디터 편집</span>
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>보관함 저장</span>
                </button>
                <button
                  onClick={handlePublishToQueue}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>🚀 네이버 블로그로 즉시 발행</span>
                </button>
              </div>
            </div>

            {/* 5단계 에이전트 단계별 실행 내역 요약 박스 */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>5단계 AI 에이전트 실행 내역:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                {result.stepsLog.map((log, idx) => (
                  <div key={idx} className="text-xs text-neutral-600 flex items-center gap-1.5 bg-white p-2 rounded-lg border border-neutral-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-neutral-800 shrink-0">{log.step}:</span>
                    <span className="truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 제목 */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                네이버 블로그 제목
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-neutral-900 leading-snug">
                {result.title}
              </h2>
            </div>

            {/* 본문 미리보기 (서식 및 인라인 이미지 렌더링) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide block">
                    스마트에디터 ONE 서식 원고 본문
                  </span>
                  <span className="text-xs text-neutral-400">
                    본문 사이사이에 고화질 이미지가 자동 배치되어 완성된 포스팅 형태로 렌더링됩니다.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <SquarePen className="w-3.5 h-3.5" />
                    <span>✏️ 원고 편집</span>
                  </button>
                  <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("smart")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        previewMode === "smart"
                          ? "bg-white text-emerald-700 shadow-2xs"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      🎨 서식·이미지 완성 뷰
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("raw")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        previewMode === "raw"
                          ? "bg-white text-emerald-700 shadow-2xs"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      📄 원본 텍스트
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. 대표 썸네일 이미지 (생성된 경우 상단 렌더링) */}
              {generatedImages[0]?.url && previewMode === "smart" && (
                <figure className="my-2 rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-xs group cursor-zoom-in">
                  <div onClick={() => setViewingImageUrl(generatedImages[0].url)} className="relative overflow-hidden">
                    <img
                      src={generatedImages[0].url}
                      alt={`${result.title} 대표 썸네일`}
                      className="w-full max-h-[460px] object-cover group-hover:scale-[1.01] transition-transform duration-200"
                    />
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      클릭하여 원본 확대
                    </div>
                  </div>
                  <figcaption className="text-center text-xs text-neutral-500 py-2.5 font-medium bg-neutral-50/80 border-t border-neutral-100">
                    📷 {result.title} 대표 썸네일
                  </figcaption>
                </figure>
              )}

              {/* 2. 본문 박스 */}
              {previewMode === "smart" ? (
                <div className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200 font-sans shadow-inner space-y-2">
                  {renderSmartArticle(result.content)}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200 font-sans text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap max-h-[550px] overflow-y-auto shadow-inner">
                  {result.content}
                </div>
              )}
            </div>

            {/* 태그 */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                추천 SEO 검색 태그 ({result.tags.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-200/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* AI 이미지 생성 & 갤러리 섹션 */}
            {result.images && result.images.length > 0 && (
              <div className="p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/60 pb-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>AI 블로그 이미지 생성 ({result.images.length}장 컷 추천)</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      모델: <span className="font-semibold text-neutral-700">{IMAGE_PLATFORMS.find((p) => p.id === imageSettings.platform)?.name} · {findImageModel(imageSettings.model)?.label}</span> ({IMAGE_RATIOS.find((r) => r.value === imageSettings.ratio)?.label || imageSettings.ratio})
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateImages}
                    disabled={imageGenerating !== null || singleGeneratingIndex !== null}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {imageGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 이미지 생성 중... ({imageGenerating.done}/{imageGenerating.total}장)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>🖼️ AI 이미지 일괄 생성 ({Math.min(imageSettings.count, result.images.length)}장)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 진행 상태 바 */}
                {imageGenerating && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        AI 이미지 실시간 생성 및 클라우드 업로드 중...
                      </span>
                      <span>
                        {imageGenerating.done} / {imageGenerating.total}장 완료
                      </span>
                    </div>
                    <div className="w-full bg-blue-200/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 transition-all duration-300 rounded-full"
                        style={{
                          width: `${(imageGenerating.done / Math.max(imageGenerating.total, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 실제 생성된 이미지 갤러리 */}
                {generatedImages.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>생성 완료된 이미지 ({generatedImages.length}장)</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        발행 시 스마트에디터 ONE에 자동으로 첨부됩니다.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {generatedImages.map((genImg, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                        >
                          {/* 이미지 썸네일 */}
                          <div
                            className="relative aspect-square w-full bg-neutral-100 cursor-pointer overflow-hidden"
                            onClick={() => setViewingImageUrl(genImg.url)}
                          >
                            <img
                              src={genImg.url}
                              alt={genImg.caption}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute top-2 left-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                                  genImg.type === "thumbnail"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-blue-600 text-white"
                                }`}
                              >
                                {genImg.type === "thumbnail" ? "⭐ 대표 썸네일" : `본문 컷 #${idx + 1}`}
                              </span>
                            </div>
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="p-2 rounded-full bg-white/90 text-neutral-800 shadow-md">
                                <Maximize2 className="w-4 h-4" />
                              </span>
                            </div>
                          </div>

                          {/* 하단 정보 & 액션 */}
                          <div className="p-2.5 space-y-2">
                            <div className="text-xs font-medium text-neutral-800 line-clamp-1" title={genImg.caption}>
                              {genImg.caption}
                            </div>
                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-100 text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(genImg.url);
                                  alert("이미지 URL이 복사되었습니다!");
                                }}
                                className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium flex items-center gap-1 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                                <span>URL 복사</span>
                              </button>
                              <a
                                href={genImg.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={`blog-image-${idx + 1}.png`}
                                className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium flex items-center gap-1 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>다운로드</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveGeneratedImage(idx)}
                                className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="이미지 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 컷별 추천 프롬프트 세부 목록 */}
                <div className="space-y-2 pt-2 border-t border-neutral-200/60">
                  <div className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">
                    각 컷별 AI 프롬프트 상세 ({result.images.length}개)
                  </div>
                  <div className="space-y-2">
                    {result.images.map((img, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-neutral-200 space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                img.type === "thumbnail"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {img.type === "thumbnail" ? "⭐ 대표 썸네일" : `본문 컷 #${idx + 1}`}
                            </span>
                            <span className="text-xs font-semibold text-neutral-800">{img.caption}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(img.prompt);
                                alert("이미지 프롬프트가 복사되었습니다!");
                              }}
                              className="text-[11px] text-neutral-600 hover:text-neutral-900 font-medium underline flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>프롬프트 복사</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleGenerateSingleImage(idx, img)}
                              disabled={singleGeneratingIndex !== null || imageGenerating !== null}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {singleGeneratingIndex === idx ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>생성 중...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3" />
                                  <span>이 컷만 생성</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-neutral-600 bg-neutral-50 p-2 rounded-lg border border-neutral-100 break-all leading-relaxed">
                          {img.prompt}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
        ) : (
          /* 대기 상태 안내 카드 */
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center text-neutral-400 shadow-xs flex flex-col items-center justify-center min-h-[300px]">
            <Sparkles className="w-10 h-10 text-neutral-300 mb-3 animate-pulse" />
            <div className="font-bold text-neutral-700 text-base">
              5단계 AI 에이전트 파이프라인 대기 중
            </div>
            <p className="mt-1 text-xs max-w-md text-neutral-500 leading-relaxed">
              상단에서 <b>6대 상황별 페르소나</b>를 선택하거나 주제/키워드를 입력한 후 <b>[5단계 AI 블로그 글 생성 시작]</b>을 누르면, 리서치부터 휴머나이징 윤문이 완료된 스마트에디터 ONE 원고가 이 자리에 완성됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 이미지 크게 보기 모달 */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setViewingImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 bg-neutral-900/90 text-white border-b border-neutral-800">
              <span className="text-xs font-medium text-neutral-300">AI 생성 이미지 원본 미리보기</span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>새 탭에서 열기</span>
                </a>
                <button
                  onClick={() => setViewingImageUrl(null)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/50 overflow-auto">
              <img
                src={viewingImageUrl}
                alt="AI Generated Blog Preview"
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. 스마트 에디터 원고 편집 모달 */}
      {result && (
        <BlogSmartEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={result.title}
          content={result.content}
          excerpt={result.excerpt || ""}
          tags={result.tags}
          category={result.category}
          categories={registeredCategories}
          generatedImages={generatedImages}
          activeImageModel={imageSettings.model}
          onSave={handleSaveEditedContent}
        />
      )}

      {/* 5. 최근 저장된 원고 열기 모달 */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[85vh]">
            <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                  로컬 보관함 원고 목록
                </span>
                <h3 className="text-base font-extrabold text-neutral-900">
                  최근 보관된 원고 불러오기
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/queue"
                  className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold underline mr-2"
                >
                  전체 보관함 보기 ↗
                </Link>
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="px-5 pt-4 pb-1">
              <ContentRetentionNotice compact />
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 divide-y divide-neutral-100">
              {(() => {
                let savedList: any[] = [];
                try {
                  savedList = JSON.parse(localStorage.getItem("nba_saved_posts") || "[]");
                } catch {}

                if (!Array.isArray(savedList) || savedList.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-neutral-400">
                      보관된 원고가 없습니다. 새 글을 생성하면 자동으로 이곳에 보관됩니다.
                    </div>
                  );
                }

                return savedList.slice(0, 15).map((post, idx) => {
                  const thumb = post.images?.[0]?.url;
                  const imgCount = post.images?.length || 0;

                  return (
                    <div
                      key={post.id || idx}
                      className="pt-3 first:pt-0 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                            <BookOpen size={16} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {post.category_name || "일반"}
                            </span>
                            {imgCount > 0 && (
                              <span className="text-[10px] text-neutral-400">
                                사진 {imgCount}장
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-400">
                              · {new Date(post.created_at).toLocaleDateString("ko-KR")}
                            </span>
                            {(() => {
                              const left = retentionDaysLeft(post.created_at);
                              const isWarning = left <= 7;
                              return (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                    isWarning
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                  }`}
                                >
                                  {left === 0 ? "오늘 삭제 예정" : `D-${left}`}
                                </span>
                              );
                            })()}
                          </div>
                          <div
                            onClick={() => handleLoadSavedPost(post)}
                            className="font-bold text-xs sm:text-sm text-neutral-900 group-hover:text-emerald-700 transition-colors truncate cursor-pointer"
                          >
                            {post.title}
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {post.excerpt || post.content?.slice(0, 80)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLoadSavedPost(post)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        불러오기
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            <footer className="border-t border-neutral-200 px-6 py-3 bg-neutral-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-neutral-400">
                원고를 선택하면 편집기 및 완성 뷰어에 즉시 로드됩니다.
              </span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-semibold"
              >
                닫기
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
