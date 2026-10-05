"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Sparkles, Loader2, ZoomIn } from "lucide-react";
import { PostContentRenderer } from "@/components/posts/PostContentRenderer";
import { ImageLightboxModal } from "@/components/ui/ImageLightboxModal";
import type { PostActionState } from "@/lib/actions/posts";
import { generateAffiliateContentAction, generateImageAction } from "@/lib/actions/ai";
import { createClient } from "@/lib/supabase/client";
import type { ThreadsTone } from "@/lib/ai/generator";
import type { AffiliateProduct } from "@/types/product";
import { PLATFORM_LABELS } from "@/types/product";
import { PersonaPicker } from "@/components/personas/PersonaPicker";
import { listMyPersonasAction } from "@/lib/actions/personas";
import { resolvePersonaTone, type SavedPersona } from "@/lib/personaTone";
import {
  type AIModelProvider,
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODELS,
  PROVIDER_SHORT_LABELS,
} from "@/lib/ai/models";
import {
  type ImageProvider,
  IMAGE_PROVIDERS,
  IMAGE_MODEL_OPTIONS,
  DEFAULT_IMAGE_MODELS,
} from "@/lib/ai/imageModels";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // Threads 공식 제한(1GB, 최대 5분, MP4/MOV)

type PublishMode = "draft" | "schedule" | "now";
type Tone = ThreadsTone;

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "전문적", label: "전문적" },
  { value: "친근함", label: "친근함" },
  { value: "설득력있는", label: "설득력있는" },
  { value: "격식있는", label: "격식있는" },
  { value: "위트있는", label: "위트있는" },
];

// 플랫폼별 제휴 고지 문구 미리보기(실제 삽입은 서버의 generateAffiliatePostContent()가
// 담당한다 — 여기서는 사용자에게 "이 문구가 자동으로 붙습니다"를 미리 보여주는 용도).
const DISCLOSURE_PREVIEW: Record<AffiliateProduct["platform"], string | null> = {
  coupang: "(광고)쿠팡파트너스 활동으로 수수료를 받을 수 있음",
  aliexpress: "(광고) 제휴 활동으로 수수료를 받을 수 있습니다.",
  naver: "(광고) 브랜드 제휴 활동으로 수수료를 받을 수 있습니다.",
  toss: "(광고) 토스쇼핑 쉐어링크 활동으로 수수료를 받을 수 있습니다.",
};

interface ProductPostFormProps {
  action: (prevState: PostActionState, formData: FormData) => Promise<PostActionState>;
  submitLabel: string;
  userId: string;
  products: AffiliateProduct[];
  initialContent?: string;
  initialImageUrl?: string;
  initialVideoUrl?: string;
  initialScheduledAtLocal?: string;
  initialPublishMode?: PublishMode;
  initialProductId?: string;
  hasThreadsAccount: boolean;
  // true면 제출 시 캡션+이미지를 무조건 함께 생성한 뒤 그 결과로 저장까지 한 번에 처리한다.
  aiGenerateOnSubmit?: boolean;
}

const initialState: PostActionState = {};

export function ProductPostForm({
  action,
  submitLabel,
  userId,
  products,
  initialContent = "",
  initialImageUrl = "",
  initialVideoUrl = "",
  initialScheduledAtLocal = "",
  initialPublishMode = "draft",
  initialProductId = "",
  hasThreadsAccount,
  aiGenerateOnSubmit = false,
}: ProductPostFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [publishMode, setPublishMode] = useState<PublishMode>(initialPublishMode);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(initialScheduledAtLocal);
  const [content, setContent] = useState(initialContent);

  const parseInitialImages = (raw: string): string[] => {
    if (!raw) return [];
    return raw.split(",").map((u) => u.trim()).filter(Boolean);
  };

  const [imageUrls, setImageUrls] = useState<string[]>(parseInitialImages(initialImageUrl));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    if (imageUrls.length + files.length > 20) {
      setUploadError("Threads에는 캐러셀 이미지를 최대 20장까지 등록할 수 있습니다.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setUploadError("이미지 파일만 업로드할 수 있습니다.");
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setUploadError("이미지 크기는 개당 5MB를 넘을 수 없습니다.");
          continue;
        }

        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage.from("post-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;

        const { data } = supabase.storage.from("post-images").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setImageUrls((prev) => [...prev, ...uploadedUrls].slice(0, 20));
        setVideoUrl(""); // 이미지와 동영상은 배타적
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const [customImageUrl, setCustomImageUrl] = useState("");
  const [urlAddError, setUrlAddError] = useState<string | null>(null);

  const handleAddCustomImageUrl = () => {
    const trimmed = customImageUrl.trim();
    setUrlAddError(null);
    if (!trimmed) return;

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setUrlAddError("올바른 이미지 웹 주소(http:// 또는 https://)를 입력해주세요.");
      return;
    }

    if (imageUrls.length >= 20) {
      setUrlAddError("이미지는 최대 20장까지 등록할 수 있습니다.");
      return;
    }

    if (imageUrls.includes(trimmed)) {
      setUrlAddError("이미 등록된 이미지 주소입니다.");
      return;
    }

    setImageUrls((prev) => [...prev, trimmed].slice(0, 20));
    setVideoUrl("");
    setCustomImageUrl("");
  };

  const handleClearAllImages = () => {
    if (imageUrls.length === 0) return;
    if (confirm("등록된 모든 이미지를 삭제하시겠습니까?")) {
      setImageUrls([]);
    }
  };

  const moveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= imageUrls.length) return;
    setImageUrls((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setVideoUploadError("영상 파일만 업로드할 수 있습니다(MP4, MOV).");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoUploadError("영상 크기는 1GB를 넘을 수 없습니다(Threads 제한).");
      return;
    }

    setVideoUploadError(null);
    setIsUploadingVideo(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "mp4";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("post-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setVideoUrl(data.publicUrl);
      setImageUrls([]); // 동영상 추가 시 이미지는 해제
    } catch (err) {
      setVideoUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const [productId, setProductId] = useState(initialProductId);
  const selectedProduct = products.find((p) => p.id === productId) ?? null;
  const [tone, setTone] = useState<Tone>("친근함");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("p-01");
  const [customPersonaText, setCustomPersonaText] = useState("");
  const [savedPersonas, setSavedPersonas] = useState<SavedPersona[]>([]);

  useEffect(() => {
    listMyPersonasAction().then((res) => setSavedPersonas(res.personas));
  }, []);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>(["", "", ""]);
  const [aiProvider, setAiProvider] = useState<AIModelProvider>("openai");
  const [aiModel, setAiModel] = useState<string>(DEFAULT_AI_MODELS["openai"]);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // v1.36: GPT / GPT-4.1 기본 선택 강제 적용
      const hasAppliedV136 = localStorage.getItem("threads_post_ai_default_v136");
      if (!hasAppliedV136) {
        setAiProvider("openai");
        setAiModel(DEFAULT_AI_MODELS["openai"]); // "gpt-4.1"
        localStorage.setItem("threads_post_ai_provider", "openai");
        localStorage.setItem("threads_post_ai_model", DEFAULT_AI_MODELS["openai"]);
        localStorage.setItem("threads_post_ai_default_v136", "true");
      } else {
        const savedProvider = localStorage.getItem("threads_post_ai_provider") as AIModelProvider | null;
        const savedModel = localStorage.getItem("threads_post_ai_model");
        if (savedProvider && (savedProvider === "openai" || savedProvider === "gemini" || savedProvider === "anthropic")) {
          setAiProvider(savedProvider);
          if (savedModel && AI_MODEL_OPTIONS.some((o) => o.provider === savedProvider && o.value === savedModel)) {
            setAiModel(savedModel);
          } else {
            setAiModel(DEFAULT_AI_MODELS[savedProvider]);
          }
        }
      }

      const hasAppliedImgV137 = localStorage.getItem("threads_post_img_default_v137");
      if (!hasAppliedImgV137) {
        setImageProvider("nanobanana");
        setImageModel(DEFAULT_IMAGE_MODELS["nanobanana"]);
        localStorage.setItem("threads_post_image_provider", "nanobanana");
        localStorage.setItem("threads_post_image_model", DEFAULT_IMAGE_MODELS["nanobanana"]);
        localStorage.setItem("threads_post_img_default_v137", "true");
      } else {
        const savedImgProvider = localStorage.getItem("threads_post_image_provider") as ImageProvider | null;
        const savedImgModel = localStorage.getItem("threads_post_image_model");
        if (savedImgProvider && (savedImgProvider === "nanobanana" || savedImgProvider === "openai" || savedImgProvider === "flux" || savedImgProvider === "zimage")) {
          setImageProvider(savedImgProvider);
          if (savedImgModel && IMAGE_MODEL_OPTIONS.some((o) => o.provider === savedImgProvider && o.value === savedImgModel)) {
            setImageModel(savedImgModel);
          } else {
            setImageModel(DEFAULT_IMAGE_MODELS[savedImgProvider]);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleProviderChange = (newProvider: AIModelProvider) => {
    setAiProvider(newProvider);
    const defaultModel = DEFAULT_AI_MODELS[newProvider];
    setAiModel(defaultModel);
    try {
      localStorage.setItem("threads_post_ai_provider", newProvider);
      localStorage.setItem("threads_post_ai_model", defaultModel);
    } catch {}
  };

  const handleModelChange = (newModel: string) => {
    setAiModel(newModel);
    try {
      localStorage.setItem("threads_post_ai_model", newModel);
    } catch {}
  };

  const [imageProvider, setImageProvider] = useState<ImageProvider>("nanobanana");
  const [imageModel, setImageModel] = useState<string>(DEFAULT_IMAGE_MODELS["nanobanana"]);

  const handleImageProviderChange = (newProvider: ImageProvider) => {
    setImageProvider(newProvider);
    const defaultModel = DEFAULT_IMAGE_MODELS[newProvider];
    setImageModel(defaultModel);
    try {
      localStorage.setItem("threads_post_image_provider", newProvider);
      localStorage.setItem("threads_post_image_model", defaultModel);
    } catch {}
  };

  const handleImageModelChange = (newModel: string) => {
    setImageModel(newModel);
    try {
      localStorage.setItem("threads_post_image_model", newModel);
    } catch {}
  };

  const handleReferenceUrlChange = (index: number, value: string) => {
    setReferenceUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (target: string) => {
    setKeywords((prev) => prev.filter((k) => k !== target));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword(keywordInput);
    }
  };

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageGenerateCount, setImageGenerateCount] = useState<number>(1);
  const [isGeneratingImage, startGeneratingImage] = useTransition();
  const [imageGenError, setImageGenError] = useState<string | null>(null);

  const handleGenerateImage = () => {
    const prompt = imagePrompt.trim() || selectedProduct?.product_name.trim() || "";
    if (!prompt) {
      setImageGenError("이미지 설명 프롬프트를 입력하거나 먼저 제휴 상품을 선택해주세요.");
      return;
    }

    if (imageUrls.length >= 20) {
      setImageGenError("이미지는 최대 20장까지 등록할 수 있습니다.");
      return;
    }

    const availableSlots = 20 - imageUrls.length;
    const countToGenerate = Math.min(Math.max(imageGenerateCount, 1), Math.min(10, availableSlots));
    if (countToGenerate <= 0) {
      setImageGenError("이미지는 최대 20장까지만 추가할 수 있습니다.");
      return;
    }

    setImageGenError(null);
    startGeneratingImage(async () => {
      if (countToGenerate > 1) {
        const generatedList: string[] = [];
        for (let i = 1; i <= countToGenerate; i++) {
          const cutPrompt = `${prompt} (${i}/${countToGenerate}번째 이미지: visual scene ${i})`;
          const result = await generateImageAction({ prompt: cutPrompt, provider: imageProvider, model: imageModel });
          if (result.imageUrl) {
            generatedList.push(result.imageUrl);
          }
        }
        if (generatedList.length > 0) {
          setImageUrls((prev) => [...prev, ...generatedList].slice(0, 20));
          setVideoUrl("");
        } else {
          setImageGenError("이미지 생성에 실패했습니다.");
        }
      } else {
        const result = await generateImageAction({ prompt, provider: imageProvider, model: imageModel });
        if (result.error) {
          setImageGenError(result.error);
          return;
        }
        if (result.imageUrl) {
          setImageUrls((prev) => [...prev, result.imageUrl!].slice(0, 20));
          setVideoUrl("");
        }
      }
    });
  };

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const runGenerateAll = async (): Promise<{ content: string; imageUrl: string } | null> => {
    setAiError(null);
    setImageGenError(null);

    if (!productId) {
      setAiError("먼저 상품을 선택해주세요. (상품 관리 화면에서 미리 등록해두세요.)");
      return null;
    }

    let finalContent = content.trim();

    if (!finalContent) {
      const validReferenceUrls = referenceUrls.map((u) => u.trim()).filter((u) => u.length > 0);
      setStatusMsg(`AI(${PROVIDER_SHORT_LABELS[aiProvider]})가 선택한 페르소나 및 상품 정보를 바탕으로 홍보 게시글을 작성하고 있습니다...`);

      const personaTone = resolvePersonaTone(
        selectedPersonaId,
        customPersonaText,
        savedPersonas,
        selectedPersonaId === "custom" ? "친근하고 자연스러운 어조" : tone,
      );

      const textResult = await generateAffiliateContentAction({
        productId,
        tone: personaTone,
        keywords,
        referenceUrls: validReferenceUrls,
        aiProvider,
        aiModel,
      });
      if (textResult.error) {
        setAiError(textResult.error);
        setStatusMsg(null);
        return null;
      }
      finalContent = textResult.content ?? "";
      setContent(finalContent);
    } else {
      setStatusMsg("입력된 내용을 저장하고 있습니다...");
    }

    const currentUrls = [...imageUrls];
    const prompt = imagePrompt.trim() || selectedProduct?.product_name.trim() || "";
    if (prompt && currentUrls.length === 0) {
      let lastError: string | undefined;
      const currentProviderConfig = IMAGE_PROVIDERS.find((p) => p.id === imageProvider);
      const currentProviderLabel = currentProviderConfig?.name || "AI";

      if (imageGenerateCount > 1) {
        const availableSlots = 20 - currentUrls.length;
        const count = Math.min(Math.max(imageGenerateCount, 1), Math.min(10, availableSlots));
        setStatusMsg(`AI(${currentProviderLabel})가 이미지 ${count}장을 생성 중입니다...`);
        for (let i = 1; i <= count; i++) {
          const cutPrompt = `${prompt} (${i}/${count}번째 이미지: visual scene ${i})`;
          const imageResult = await generateImageAction({ prompt: cutPrompt, provider: imageProvider, model: imageModel });
          if (imageResult.imageUrl) {
            currentUrls.push(imageResult.imageUrl);
          } else if (imageResult.error) {
            lastError = imageResult.error;
          }
        }
        if (currentUrls.length > 0) {
          setImageUrls(currentUrls);
        }
      } else {
        const MAX_IMAGE_ATTEMPTS = 2;
        for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt += 1) {
          setStatusMsg(
            attempt === 1
              ? `게시글에 어울리는 이미지를 ${currentProviderLabel}으로 생성하고 있습니다...`
              : `이미지 생성에 실패해서 다시 시도하고 있습니다... (${attempt}/${MAX_IMAGE_ATTEMPTS})`,
          );
          const imageResult = await generateImageAction({ prompt, provider: imageProvider, model: imageModel });
          if (imageResult.imageUrl) {
            currentUrls.push(imageResult.imageUrl);
            setImageUrls(currentUrls);
            lastError = undefined;
            break;
          }
          lastError = imageResult.error;
        }
      }
      if (lastError && currentUrls.length === 0) {
        setImageGenError(lastError);
      }
    }

    setStatusMsg(null);
    return { content: finalContent, imageUrl: currentUrls.join(",") };
  };

  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [generateSuccessMsg, setGenerateSuccessMsg] = useState<string | null>(null);

  // 1) 본문 글만 다시 생성
  const handleGenerateTextOnly = async () => {
    if (!productId) {
      setAiError("먼저 제휴 상품을 선택해주세요.");
      return;
    }
    setAiError(null);
    setIsGeneratingText(true);
    setStatusMsg(`AI(${PROVIDER_SHORT_LABELS[aiProvider]})가 게시글 본문을 작성하고 있습니다...`);
    try {
      const validReferenceUrls = referenceUrls.map((u) => u.trim()).filter((u) => u.length > 0);
      const personaTone = resolvePersonaTone(
        selectedPersonaId,
        customPersonaText,
        savedPersonas,
        selectedPersonaId === "custom" ? "친근하고 자연스러운 어조" : tone,
      );
      const textResult = await generateAffiliateContentAction({
        productId,
        tone: personaTone,
        keywords,
        referenceUrls: validReferenceUrls,
        aiProvider,
        aiModel,
      });
      if (textResult.error) {
        setAiError(textResult.error);
        return;
      }
      if (textResult.content) {
        setContent(textResult.content);
        setGenerateSuccessMsg("✅ AI 본문이 새로 작성되었습니다.");
      }
    } finally {
      setIsGeneratingText(false);
      setStatusMsg(null);
    }
  };

  // 2) AI 글 & 이미지 한 번에 실시간 생성 (미리보기 화면 채우기)
  const handleGenerateAll = async () => {
    if (!productId) {
      setAiError("먼저 제휴 상품을 선택해주세요.");
      return;
    }
    setAiError(null);
    setImageGenError(null);
    setGenerateSuccessMsg(null);
    setIsGeneratingAll(true);
    try {
      const result = await runGenerateAll();
      if (result && result.content) {
        setGenerateSuccessMsg(
          "✅ AI 글과 이미지가 생성되었습니다! 아래에서 내용을 확인 및 수정하거나, 불필요한 이미지는 ✕로 삭제/추가한 후 맨 아래에서 즉시 포스팅 또는 임시저장을 선택하세요."
        );
      }
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const scheduledAtIso =
    publishMode === "schedule" && scheduledAtLocal
      ? new Date(scheduledAtLocal).toISOString()
      : "";

  const buildFormData = (finalContent: string, finalImageUrl: string, targetMode: PublishMode = publishMode) => {
    const fd = new FormData();
    fd.set("content", finalContent);
    fd.set("imageUrl", finalImageUrl);
    fd.set("videoUrl", videoUrl);
    fd.set("publishMode", targetMode);
    fd.set("scheduledAt", targetMode === "schedule" && scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : "");
    fd.set("productId", productId);
    return fd;
  };

  // 3) 최종 발행 / 임시저장 실행 (실시간 원클릭 분기)
  const handleFinalSubmit = async (targetMode: PublishMode) => {
    setPublishMode(targetMode);
    setAiError(null);

    if (targetMode === "now" && !hasThreadsAccount) {
      setAiError("Threads 계정이 연결되어 있지 않아 즉시 게시할 수 없습니다. 설정 메뉴에서 계정 연결 후 이용해주세요.");
      return;
    }

    if (!productId) {
      setAiError("먼저 제휴 상품을 선택해주세요.");
      return;
    }

    if (targetMode === "schedule" && !scheduledAtLocal) {
      setAiError("예약 게시 날짜 및 시각을 선택해주세요.");
      return;
    }

    // 아직 본문이 비어있다면 자동 생성 후 제출 (초고속 원클릭 모드)
    if (!content.trim()) {
      setIsGeneratingAll(true);
      const result = await runGenerateAll();
      setIsGeneratingAll(false);
      if (!result) return;
      startTransition(() => {
        formAction(buildFormData(result.content, result.imageUrl, targetMode));
      });
      return;
    }

    // 이미 본문이 채워져 있다면 현재 화면의 본문과 이미지/영상을 그대로 즉시 제출
    startTransition(() => {
      formAction(buildFormData(content, imageUrls.join(","), targetMode));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleFinalSubmit(publishMode);
  };

  const disclosurePreview = selectedProduct ? DISCLOSURE_PREVIEW[selectedProduct.platform] : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ⚡ AI 글 & 이미지 실시간 원클릭 생성 바 */}
      <div className="rounded-2xl border-2 border-amber-300/90 bg-gradient-to-r from-amber-50 via-orange-50/50 to-purple-50/40 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-1.5">
              <span>⚡</span>
              <span>AI 글 & 이미지 실시간 원클릭 생성</span>
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              상품과 엔진을 선택한 후 버튼을 누르면, 화면에 본문 캡션과 고화질 이미지를 즉시 생성하여 펼쳐 보여줍니다.
              생성된 글과 이미지를 확인·수정한 뒤 즉시 포스팅하거나 임시저장할 수 있습니다.
            </p>
          </div>
          <Button
            type="button"
            variant="amber"
            onClick={handleGenerateAll}
            disabled={isGeneratingAll || !productId}
            className="font-extrabold text-sm py-3 px-5 whitespace-nowrap shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>AI가 글 & 이미지 생성 중...</span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-amber-500 text-xs font-black shadow-2xs">
                  ✨
                </span>
                <span>AI 글 & 이미지 생성하기</span>
              </>
            )}
          </Button>
        </div>

        {statusMsg && (
          <div className="animate-pulse rounded-xl bg-blue-100/90 border border-blue-300 px-3.5 py-2.5 text-xs font-bold text-blue-900 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-700" />
            <span>{statusMsg}</span>
          </div>
        )}

        {generateSuccessMsg && (
          <div className="rounded-xl bg-emerald-100/90 border border-emerald-300 px-3.5 py-2.5 text-xs font-bold text-emerald-900 flex items-center justify-between gap-2 shadow-2xs">
            <span>{generateSuccessMsg}</span>
            <button
              type="button"
              onClick={() => setGenerateSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer text-xs ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          [섹션 1. 상단 대형 박스]: 📝 게시글 작성 및 콘텐츠 설정 (블루 테마)
          - 포함: 🛍️ 상품 선택, 🎭 AI 페르소나, 🏷️ 키워드/링크, ✍️ Threads 본문
         ======================================================== */}
      <section className="rounded-2xl border-2 border-blue-200/80 bg-blue-50/25 p-4 sm:p-5 space-y-4 shadow-xs">
        {/* 섹션 1 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-blue-200/70">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black shadow-xs">1</span>
            <h2 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
              <span>📝 게시글 작성 및 콘텐츠 설정</span>
              <span className="hidden sm:inline-block rounded-md bg-blue-600/10 text-blue-700 px-2 py-0.5 text-xs font-bold border border-blue-200">
                상품 · 페르소나 · 키워드 · 본문
              </span>
            </h2>
          </div>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-extrabold text-blue-700 border border-blue-200">
            STEP 1
          </span>
        </div>

        {/* 🛍️ 상품 선택 (흰색 카드) */}
        <div className="space-y-3 rounded-xl border border-blue-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <span>🛍️ 제휴 상품 선택</span>
                <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">필수</span>
              </label>
            </div>
            <span className="text-[11px] font-medium text-blue-700">
              {products.length > 0 ? `등록 상품 ${products.length}개` : "상품 없음"}
            </span>
          </div>

          <div>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">상품을 선택해주세요</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{PLATFORM_LABELS[p.platform]}] {p.product_name}
                </option>
              ))}
            </select>
            {products.length === 0 && (
              <p className="mt-1.5 text-xs font-medium text-amber-700">
                등록된 상품이 없습니다. 좌측 메뉴의 &quot;상품 관리&quot; 화면에서 먼저 상품을 등록해주세요.
              </p>
            )}
          </div>

          {selectedProduct && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-950 font-semibold">
                <span>🔗 제휴 링크:</span>
                <span className="break-all font-mono font-normal text-neutral-600">{selectedProduct.affiliate_url}</span>
              </div>
              {disclosurePreview && (
                <p className="text-amber-800 bg-amber-50 border border-amber-200/70 rounded p-2 text-[11px] leading-relaxed">
                  ⚠️ <strong>공정위 광고 고지 문구 자동 삽입:</strong> 캡션 끝에 아래 문구가 자동으로 포함됩니다:
                  <br />
                  <span className="font-semibold">{disclosurePreview}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* 🎭 AI 페르소나 스타일 선택 (흰색 카드) */}
        <div className="space-y-3 rounded-xl border border-purple-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <span>🎭 AI 페르소나 스타일 선택</span>
                <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">어조 반영</span>
              </label>
            </div>
            <span className="text-[11px] font-medium text-purple-700">선택 시 해당 인격 어조로 캡션 생성</span>
          </div>

          <PersonaPicker
            value={selectedPersonaId}
            onChange={setSelectedPersonaId}
            customText={customPersonaText}
            onCustomTextChange={setCustomPersonaText}
            savedPersonas={savedPersonas}
            onPersonaSaved={(p) => setSavedPersonas((prev) => [...prev, p])}
          />
        </div>

        {/* 🏷️ 타겟 키워드 & 참고 자료 (흰색 카드) */}
        <div className="space-y-3.5 rounded-xl border border-emerald-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <span>🏷️ 타겟 키워드 & 참고 링크</span>
                <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">선택</span>
              </label>
            </div>
            <span className="text-[11px] font-medium text-emerald-700">본문 카피에 자연스럽게 반영</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-700">핵심 키워드</label>
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder="키워드 입력 후 Enter (예: 가성비, 자취템, 필수템)"
              className="text-sm bg-neutral-50/50 border-neutral-300 focus:border-emerald-500 focus:ring-emerald-200"
              autoComplete="off"
              name="ai_keyword_field"
            />
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                  >
                    #{kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-emerald-600 hover:text-emerald-950 font-bold ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-700">참고 웹페이지 링크 (실시간 스크래핑 분석)</label>
              <span className="text-[11px] text-neutral-400 font-medium">최대 3개</span>
            </div>
            <div className="space-y-1.5">
              {referenceUrls.map((url, idx) => (
                <Input
                  key={idx}
                  type="text"
                  name={`ai_reference_url_field_${idx + 1}`}
                  autoComplete="off"
                  value={url}
                  onChange={(e) => handleReferenceUrlChange(idx, e.target.value)}
                  placeholder={`https://example.com/reference-${idx + 1}`}
                  className="text-sm bg-neutral-50/50 border-neutral-300 focus:border-emerald-500 focus:ring-emerald-200"
                />
              ))}
            </div>
          </div>

          {aiError && <p className="text-xs font-semibold text-red-600">{aiError}</p>}
        </div>

        {/* ✍️ Threads 게시글 본문 (흰색 카드) */}
        <div className="space-y-2.5 rounded-xl border border-neutral-300 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <span>✍️ Threads 게시글 본문</span>
                <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700">미리보기 & 직접 수정</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateTextOnly}
                disabled={isGeneratingText || isGeneratingAll || !productId}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40 ml-1"
              >
                <span>🔄</span>
                <span>{isGeneratingText ? "작성 중..." : "AI 글만 다시 생성"}</span>
              </button>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              content.length > 500
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-neutral-100 text-neutral-600 border border-neutral-200"
            }`}>
              {content.length} / 500자
            </span>
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed">
            💡 위에서 생성된 본문이 여기에 표시되며, 원하는 대로 직접 문구를 수정하거나 다듬을 수 있습니다.
          </p>

          <Textarea
            name="content"
            rows={6}
            maxLength={500}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Threads에 게시할 내용을 입력하거나, 생성된 내용이 여기에 표시됩니다."
            className="bg-neutral-50/30 border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900 text-sm leading-relaxed"
          />

          {content && content.includes("http") && (
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <span>🔗 상품 링크 바로가기 검수:</span>
                <span className="text-[10px] font-normal text-blue-700">(클릭하여 실제 연결 페이지를 확인하세요)</span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-blue-100 text-xs">
                <PostContentRenderer content={content} className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-800" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          [섹션 2. 대형 통합 박스]: 🤖 AI 생성 엔진 및 미디어 설정 (퍼플 테마)
          - 생성 모델 전체를 하나의 대형 박스로 통합:
            1) 🤖 AI 글 생성 엔진 선택 (GPT / Claude / Gemini)
            2) 🖼️ 이미지 & 미디어 설정 (NanoBanana / GPT Image / FLUX / Z-Image · 캐러셀 최대 20장 · 동영상)
         ======================================================== */}
      <section className="rounded-2xl border-2 border-purple-200/90 bg-purple-50/25 p-4 sm:p-5 space-y-4 shadow-xs">
        {/* 섹션 2 통합 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-200/80">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-white text-xs font-black shadow-xs">2</span>
            <h2 className="text-base font-extrabold text-purple-950 flex items-center gap-2">
              <span>🤖 AI 생성 엔진 & 미디어 설정</span>
            </h2>
          </div>
          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-extrabold text-purple-800 border border-purple-200">
            STEP 2
          </span>
        </div>

        {/* [서브 카드 A]: 🤖 AI 글 생성 엔진 선택 (흰색 카드) */}
        <div className="space-y-3 rounded-xl border border-purple-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100 text-purple-700 text-[10px] font-black">A</span>
              <span>🤖 AI 글 생성 엔진 선택</span>
              <span className="hidden sm:inline-block text-[10px] text-neutral-500 font-normal">GPT / Claude / Gemini</span>
            </label>
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
              글 생성 시 적용
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* 1. GPT */}
            <button
              type="button"
              onClick={() => handleProviderChange("openai")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                aiProvider === "openai"
                  ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">🤖</span>
              <span className="font-extrabold text-sm tracking-tight">GPT</span>
              <span className="text-[10px] opacity-75 font-normal">OpenAI</span>
            </button>

            {/* 2. Claude */}
            <button
              type="button"
              onClick={() => handleProviderChange("anthropic")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                aiProvider === "anthropic"
                  ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">🧠</span>
              <span className="font-extrabold text-sm tracking-tight">Claude</span>
              <span className="text-[10px] opacity-75 font-normal">Anthropic</span>
            </button>

            {/* 3. Gemini */}
            <button
              type="button"
              onClick={() => handleProviderChange("gemini")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                aiProvider === "gemini"
                  ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">✨</span>
              <span className="font-extrabold text-sm tracking-tight">Gemini</span>
              <span className="text-[10px] opacity-75 font-normal">Google</span>
            </button>
          </div>

          <div className="pt-2 border-t border-neutral-100 space-y-1.5">
            <label className="block text-[11px] font-bold text-neutral-700 flex items-center justify-between">
              <span>🎯 {PROVIDER_SHORT_LABELS[aiProvider]} 세부 실행 모델 (2026 최신 라인업):</span>
            </label>
            <select
              value={aiModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs font-semibold text-neutral-900 focus:border-purple-600 focus:outline-none shadow-2xs cursor-pointer"
            >
              {AI_MODEL_OPTIONS.filter((opt) => opt.provider === aiProvider).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* [서브 카드 B]: 🖼️ 이미지 & 미디어 설정 (흰색 카드) */}
        <div className="space-y-3 rounded-xl border border-amber-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">B</span>
              <span>🖼️ 이미지 & 미디어 설정</span>
              <span className="hidden sm:inline-block text-[10px] text-neutral-500 font-normal">NanoBanana · GPT Image · FLUX · Z-Image</span>
            </label>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
              캐러셀 최대 20장 · AI 이미지 · 동영상
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* 1. NanoBanana */}
            <button
              type="button"
              onClick={() => handleImageProviderChange("nanobanana")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                imageProvider === "nanobanana"
                  ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">🍌</span>
              <span className="font-extrabold text-xs tracking-tight">NanoBanana</span>
              <span className="text-[10px] opacity-80 font-normal">Google Gemini</span>
            </button>

            {/* 2. GPT Image */}
            <button
              type="button"
              onClick={() => handleImageProviderChange("openai")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                imageProvider === "openai"
                  ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">🤖</span>
              <span className="font-extrabold text-xs tracking-tight">GPT Image</span>
              <span className="text-[10px] opacity-80 font-normal">OpenAI</span>
            </button>

            {/* 3. FLUX */}
            <button
              type="button"
              onClick={() => handleImageProviderChange("flux")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                imageProvider === "flux"
                  ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">⚡</span>
              <span className="font-extrabold text-xs tracking-tight">FLUX 2.0</span>
              <span className="text-[10px] opacity-80 font-normal">Black Forest</span>
            </button>

            {/* 4. Z-Image */}
            <button
              type="button"
              onClick={() => handleImageProviderChange("zimage")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                imageProvider === "zimage"
                  ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">🚀</span>
              <span className="font-extrabold text-xs tracking-tight">Z-Image</span>
              <span className="text-[10px] opacity-80 font-normal">Alibaba 6B</span>
            </button>
          </div>

          <div className="pt-2 border-t border-neutral-200/80">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
              {/* 좌측: 세부 실행 모델 선택 */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <label className="block text-[11px] font-bold text-neutral-600">
                  🎯 {IMAGE_PROVIDERS.find((p) => p.id === imageProvider)?.name} 세부 실행 모델:
                </label>
                <select
                  value={imageModel}
                  onChange={(e) => handleImageModelChange(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none shadow-2xs cursor-pointer"
                >
                  {IMAGE_MODEL_OPTIONS.filter((opt) => opt.provider === imageProvider).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 우측: 생성 장수 선택 */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-600">
                  🔢 생성 장수:
                </label>
                <div className="flex items-center rounded-xl border border-neutral-300 bg-white p-1 shadow-2xs">
                  <select
                    value={imageGenerateCount}
                    onChange={(e) => setImageGenerateCount(Number(e.target.value))}
                    className="rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-900 focus:border-neutral-900 focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num}장 {num === 1 ? "(기본)" : "생성"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 한 줄 전체 이미지 설명 프롬프트 입력창 & 이미지 생성 버튼 */}
          <div className="flex items-center gap-2 pt-1">
            <Input
              className="flex-1 bg-neutral-50/50 text-sm"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder={
                selectedProduct
                  ? `비워두면 "${selectedProduct.product_name}"를 프롬프트로 사용`
                  : "이미지 설명 프롬프트 입력"
              }
              autoComplete="off"
              name="ai_image_prompt_field"
            />
            <Button
              type="button"
              variant="amber"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || isGeneratingAll || imageUrls.length >= 20}
              className="font-extrabold whitespace-nowrap px-4 py-2.5 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-amber-500 text-xs shadow-2xs shrink-0 font-black">
                    ✨
                  </span>
                  <span>
                    {imageGenerateCount > 1
                      ? `이미지 ${imageGenerateCount}장 생성`
                      : "AI 이미지 생성"}
                  </span>
                </>
              )}
            </Button>
          </div>

          {imageGenError && <p className="text-xs font-semibold text-red-600">{imageGenError}</p>}
        </div>

        {/* 대표 상품 이미지 추가 (흰색 카드) */}
        {selectedProduct?.image_url && (
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedProduct.image_url}
              alt="상품 등록 이미지"
              className="h-14 w-14 rounded-lg object-cover border border-neutral-200"
            />
            <div className="flex-1 text-xs text-neutral-500">
              상품 등록 시 수집된 대표 썸네일 이미지가 있습니다.
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!imageUrls.includes(selectedProduct.image_url!)) {
                  setImageUrls((prev) => [...prev, selectedProduct.image_url!].slice(0, 20));
                  setVideoUrl("");
                }
              }}
              disabled={imageUrls.includes(selectedProduct.image_url!)}
            >
              {imageUrls.includes(selectedProduct.image_url!) ? "추가됨" : "+ 대표 이미지 추가"}
            </Button>
          </div>
        )}

        {/* 📁 이미지 직접 추가 / 삭제 및 캐러셀 관리 카드 (흰색 카드) */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-3.5">
          {/* 헤더 & 전체 삭제 버튼 */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <span>📁</span>
                <span>사용자 이미지 추가 및 삭제 관리</span>
              </span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-700 border border-neutral-200">
                {imageUrls.length} / 20장
              </span>
            </div>
            {imageUrls.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllImages}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>🗑️ 전체 이미지 삭제</span>
              </button>
            )}
          </div>

          {/* 이미지 추가 2가지 방식: 파일 업로드 버튼 + URL 직접 입력 추가 */}
          <div className="space-y-2">
            {/* 1) 파일 직접 업로드 버튼 */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={isUploading || imageUrls.length >= 20}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || imageUrls.length >= 20}
                className="text-xs font-bold"
              >
                {isUploading ? "업로드 중..." : "📂 내 PC에서 이미지 파일 추가 (다중 선택 가능)"}
              </Button>
              <span className="text-[11px] text-neutral-400">JPG, PNG, WEBP 지원 (최대 20장)</span>
            </div>

            {/* 2) 이미지 URL 직접 입력하여 추가 */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="이미지 웹 주소(URL)를 입력하여 추가 (예: https://.../image.jpg)"
                className="text-xs bg-neutral-50/50 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomImageUrl();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddCustomImageUrl}
                disabled={!customImageUrl.trim() || imageUrls.length >= 20}
                className="text-xs font-bold whitespace-nowrap"
              >
                + URL로 추가
              </Button>
            </div>
            {urlAddError && <p className="text-xs font-semibold text-red-600">{urlAddError}</p>}
            {uploadError && <p className="text-xs font-semibold text-red-600">{uploadError}</p>}
          </div>

          {/* 3) 등록된 이미지 썸네일 그리드 & 개별 삭제 버튼 */}
          {imageUrls.length > 0 ? (
            <div className="pt-2 space-y-2.5 border-t border-neutral-100">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                <span>📷 등록된 미디어 캐러셀 ({imageUrls.length}/20)</span>
                <span className="text-[11px] text-blue-600 font-normal">
                  * 생성/추가된 이미지 중 마음에 드는 것만 남기고 ✕로 삭제하거나, ◀ ▶로 순서를 조정하세요.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl border border-neutral-200 bg-neutral-100 p-1 overflow-hidden shadow-2xs hover:border-neutral-400 hover:shadow-xs transition-all"
                  >
                    {/* 이미지 클릭 시 라이트박스 확대 보기 */}
                    <div
                      onClick={() => {
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }}
                      className="relative h-28 w-full overflow-hidden rounded-lg cursor-pointer bg-neutral-200"
                      title="클릭하여 전체 이미지 확대 보기"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`미디어 ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />

                      {/* 호버 시 돋보기 오버레이 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-xs transition-all transform scale-95 group-hover:scale-100 flex items-center gap-1 shadow-md">
                          <ZoomIn className="h-3 w-3 text-amber-300" />
                          <span>확대 보기</span>
                        </span>
                      </div>
                    </div>

                    <span className="absolute top-2 left-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs pointer-events-none">
                      {idx + 1}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      className="absolute top-2 right-2 rounded-full bg-red-600 hover:bg-red-700 p-1.5 text-white shadow-xs transition-transform hover:scale-110 cursor-pointer z-10"
                      title={`이미지 ${idx + 1} 삭제`}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* 카드 하단 액션: 순서 이동 (◀ ▶) 및 삭제 */}
                    <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-neutral-500">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImage(idx, idx - 1);
                          }}
                          disabled={idx === 0}
                          className="rounded px-1 py-0.5 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-700 font-bold"
                          title="앞으로 이동"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImage(idx, idx + 1);
                          }}
                          disabled={idx === imageUrls.length - 1}
                          className="rounded px-1 py-0.5 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-700 font-bold"
                          title="뒤로 이동"
                        >
                          ▶
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(idx);
                        }}
                        className="text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}

                {/* + 추가하기 점선 카드 (20장 미만일 때) */}
                {imageUrls.length < 20 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-36 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/50 hover:bg-neutral-100/70 hover:border-neutral-400 transition-all cursor-pointer text-neutral-500 hover:text-neutral-800"
                    title="이미지 추가"
                  >
                    <span className="text-xl">➕</span>
                    <span className="text-xs font-bold">이미지 추가</span>
                    <span className="text-[10px] text-neutral-400">({imageUrls.length}/20)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* 등록된 이미지가 없을 때의 안내 박스 */
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center text-xs text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-600">등록된 이미지가 없습니다.</p>
              <p className="text-[11px] text-neutral-400">
                위의 AI 이미지 생성기를 이용하거나, 내 PC 파일 추가 / 웹 URL 입력으로 이미지를 추가해보세요. (최대 20장)
              </p>
            </div>
          )}
          <input type="hidden" name="imageUrl" value={imageUrls.join(",")} />
        </div>

        {/* 🎬 영상 (선택) (흰색 카드) */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-800">🎬 동영상 첨부 (선택)</label>
            <span className="text-[11px] text-neutral-400">MP4/MOV, 최대 1GB, 최대 5분</span>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">
            이미지와 영상은 동시에 첨부할 수 없습니다 — 영상을 등록하면 이미지는 자동으로 해제됩니다.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              disabled={isUploadingVideo}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploadingVideo}
            >
              {isUploadingVideo ? "업로드 중..." : "영상 직접 등록하기"}
            </Button>
          </div>
          {videoUploadError && <p className="text-xs text-red-600">{videoUploadError}</p>}
          <Input
            name="videoUrl"
            type="url"
            value={videoUrl}
            onChange={(e) => {
              setVideoUrl(e.target.value);
              if (e.target.value) setImageUrls([]);
            }}
            placeholder="https://example.com/video.mp4 (또는 위에서 직접 업로드)"
            className="mt-2 text-sm bg-neutral-50/50"
          />
          {videoUrl && (
            <video
              src={videoUrl}
              controls
              className="mt-2 max-h-40 rounded-lg border border-neutral-200"
            />
          )}
        </div>
      </section>

      {/* ========================================================
          [섹션 3. 발행 결정 대형 박스]: 🚀 게시방식 결정 및 최종 발행 (슬레이트 테마)
         ======================================================== */}
      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100/60 p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-900 text-white text-xs font-black shadow-xs">3</span>
            <h2 className="text-base font-extrabold text-neutral-950 flex items-center gap-2">
              <span>🚀 게시방식 결정 및 최종 발행</span>
            </h2>
          </div>
          <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-extrabold text-neutral-800">
            STEP 3
          </span>
        </div>

        {/* 2대 스마트 분기 버튼: [ ⚡ 즉시 Threads 포스팅 ] vs [ 📁 임시저장 ] */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-700">최종 발행 방식 선택</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 버튼 1. 즉시 Threads에 포스팅하기 */}
            <button
              type="button"
              onClick={() => handleFinalSubmit("now")}
              disabled={isPending || isGeneratingAll || !hasThreadsAccount}
              className="w-full rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white p-4 font-black text-base shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <span>⚡ 즉시 Threads에 포스팅하기</span>
              </div>
              <span className="text-[11px] font-normal text-neutral-300">
                {content.trim() ? "현재 확인된 글과 미디어 그대로 즉시 발행" : "AI 자동 생성 후 즉시 연동 계정에 자동 발행"}
              </span>
            </button>

            {/* 버튼 2. 임시저장하기 */}
            <button
              type="button"
              onClick={() => handleFinalSubmit("draft")}
              disabled={isPending || isGeneratingAll}
              className="w-full rounded-2xl bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-900 border-2 border-neutral-300 hover:border-neutral-400 p-4 font-black text-base shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">📁</span>
                <span>💾 임시저장하기</span>
              </div>
              <span className="text-[11px] font-normal text-neutral-500">
                보관함에 저장 (나중에 언제든 수정·발행 가능)
              </span>
            </button>
          </div>
        </div>

        {!hasThreadsAccount && (
          <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            ⚠️ Threads 계정이 연결되어 있지 않아 [즉시 포스팅]은 비활성화됩니다. [임시저장] 후 설정 메뉴에서 계정을 연결해주세요.
          </p>
        )}

        {/* 예약 발행 접이식 영역 */}
        <div className="pt-2 border-t border-neutral-200/80">
          <details className="group">
            <summary className="cursor-pointer text-xs font-bold text-neutral-700 hover:text-neutral-950 flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5">
                <span>⏰</span>
                <span>원하는 특정 시각에 예약 발행하고 싶으신가요? (예약 설정 펼치기)</span>
              </span>
              <span className="text-xs text-neutral-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="pt-3 pb-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="datetime-local"
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                  className="bg-white max-w-xs text-sm"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleFinalSubmit("schedule")}
                  disabled={isPending || isGeneratingAll || !scheduledAtLocal || !hasThreadsAccount}
                  className="font-bold whitespace-nowrap text-xs py-2 px-4 shadow-xs"
                >
                  📅 지정한 시각에 예약 발행하기
                </Button>
              </div>
              <p className="text-[11px] text-neutral-500">
                지정한 날짜와 시각이 되면 서버에서 자동으로 Threads에 포스팅합니다.
              </p>
            </div>
          </details>
        </div>

        <input type="hidden" name="scheduledAt" value={scheduledAtIso} />
        <input type="hidden" name="productId" value={productId} />

        {state.error && (
          <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {state.error}
          </p>
        )}

        {aiError && (
          <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {aiError}
          </p>
        )}
      </section>

      {/* 전체 이미지 확대 보기 라이트박스 모달 */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        images={imageUrls}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </form>
  );
}
