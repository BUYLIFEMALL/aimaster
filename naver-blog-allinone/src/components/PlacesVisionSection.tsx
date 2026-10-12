"use client";

import React, { useEffect, useState } from "react";
import {
  Camera,
  Upload,
  Star,
  Trash2,
  MapPin,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Palette,
  RotateCcw,
  Save,
  Settings2,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { AppSettings } from "@/lib/storage";
import { UploadedPhoto, processImageFile } from "@/lib/imageUtils";
import { overlayThumbnailTitle } from "@/lib/blog/canvas";
import { missingKeyMessage, resolveTextEngine } from "@/lib/blog/models";
import { BLOG_PERSONAS, type BlogPersona } from "@/lib/blog/personas";
import { runBlogPipeline } from "@/lib/blog/pipeline";
import { callLlm } from "@/lib/blog/llm";
import { HumanStylePanel } from "@/components/blog/HumanStylePanel";
import { buildCustomPersona, requestExperienceQuestions } from "@/lib/blog/humanVoice";
import { parseJsonLoose } from "@/lib/blog/gemini";
import { uploadImage } from "@/lib/blog/postsApi";
import { IMAGE_RATIOS, type ImageRatio } from "@/lib/blog/types";
import type { WritingStyle, WritingTone } from "@/lib/blog/styles";
import { GenerationPanel } from "@/components/blog/GenerationPanel";
import { ModelSettingsCard } from "@/components/blog/ModelSettingsCard";
import { CategorySelect } from "@/components/blog/CategorySelect";
import { clearGenPrefs, loadGenPrefs, prefsSavedAt, saveGenPrefs, PLACES_PREFS_KEY } from "@/lib/blog/prefs";
import { NaverCategoryPicker } from "@/components/blog/NaverCategoryPicker";
import { loadLastNaverCategory, saveLastNaverCategory, type NaverCategory } from "@/lib/blog/naverCategory";
import { PostWorkspaceView } from "@/components/blog/PostWorkspaceView";
import { useBlogWorkspace } from "@/components/blog/useBlogWorkspace";

interface PlacesVisionSectionProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  /** 모델 선택을 저장하면 앱 전체 설정도 갱신한다 */
  onSettingsChange: (next: AppSettings) => void;
  onOpenLibrary: () => void;
}

const COLOR_THEMES = [
  { id: "blue-gray", name: "블루-그레이", desc: "차분하고 전문적인 느낌", color: "#3b82f6", subColor: "#64748b" },
  { id: "green-orange", name: "그린-오렌지", desc: "활기차고 친근한 느낌", color: "#10b981", subColor: "#f97316" },
  { id: "purple-yellow", name: "퍼플-옐로우", desc: "세련되고 창의적인 느낌", color: "#8b5cf6", subColor: "#eab308" },
  { id: "teal-lightgray", name: "틸-라이트그레이", desc: "안정적이고 현대적인 느낌", color: "#14b8a6", subColor: "#94a3b8" },
  { id: "terracotta-lightgray", name: "테라코타-라이트그레이", desc: "따뜻하고 편안한 느낌", color: "#e07a5f", subColor: "#94a3b8" },
  { id: "classic-blue", name: "클래식 블루", desc: "신뢰할 수 있고 안정적인 느낌", color: "#1d4ed8", subColor: "#3b82f6" },
  { id: "nature-green", name: "네이처 그린", desc: "생기 있고 조화로운 느낌", color: "#15803d", subColor: "#22c55e" },
];

export function PlacesVisionSection({ settings, onOpenSettings, onSettingsChange, onOpenLibrary }: PlacesVisionSectionProps) {
  // Photos state
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [processingFiles, setProcessingFiles] = useState(false);

  // SEO Optimization Mode
  const [seoMode, setSeoMode] = useState<"homefeed" | "standard">("homefeed");

  // SEO Keywords
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [naverCategory, setNaverCategory] = useState<NaverCategory | null>(null);
  // 마지막으로 쓴 네이버 카테고리를 기본값으로 자동 선택
  useEffect(() => {
    setNaverCategory(loadLastNaverCategory(window.localStorage));
  }, []);
  const [mainKeyword, setMainKeyword] = useState("");
  const [subKeywords, setSubKeywords] = useState("");
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);

  // Visit info fields
  const [placeName, setPlaceName] = useState("");
  const [category, setCategory] = useState("맛집");
  const [region, setRegion] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [companion, setCompanion] = useState("");
  const [oneLineImpression, setOneLineImpression] = useState("");
  const [placeDetails, setPlaceDetails] = useState("");

  // Options
  const [selectedTheme, setSelectedTheme] = useState("green-orange");
  const [includeFaq, setIncludeFaq] = useState(true);
  const [thumbnailText, setThumbnailText] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<ImageRatio>("16:9");
  // 사진이 없을 때 쓰는 AI 이미지 옵션(아이디어 탭과 같은 옵션). 사진을 올리면 사진이 우선이다.
  const [withThumbnailAi, setWithThumbnailAi] = useState(true);
  const [bodyImages, setBodyImages] = useState(2);
  const [autoImages, setAutoImages] = useState(true);
  const [interactive, setInteractive] = useState(false);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [purposeText, setPurposeText] = useState("");
  // 사람이 쓴 글 만들기: 작성자 소개·인간화·실제 방문 경험
  const [customPersonaText, setCustomPersonaText] = useState("");
  const [humanStyle, setHumanStyle] = useState(true);
  const [experience, setExperience] = useState("");
  const [experienceHints, setExperienceHints] = useState<string[]>([]);
  const [hintsLoading, setHintsLoading] = useState(false);
  const [angleTopic, setAngleTopic] = useState(""); // 특정 주제·글의 관점(페르소나가 채움, 수정 가능)
  const [personaKeywords, setPersonaKeywords] = useState(""); // 페르소나 추천 검색 키워드(수정 가능)
  const [prefsNotice, setPrefsNotice] = useState("");
  const [prefsAt, setPrefsAt] = useState<string | null>(null);
  const [targetLength, setTargetLength] = useState(2000);
  const [tone, setTone] = useState<WritingTone>("해요체");
  const [style, setStyle] = useState<WritingStyle>("conversational");

  // 설정값 저장(이 브라우저에 기본값으로 저장) — 아이디어 탭과 같은 방식, 맛집 탭 전용 키
  useEffect(() => {
    const saved = loadGenPrefs(window.localStorage, PLACES_PREFS_KEY);
    setPrefsAt(prefsSavedAt(window.localStorage, PLACES_PREFS_KEY));
    if (!saved) return;
    if (saved.themeId) setSelectedTheme(saved.themeId);
    if (saved.ratio) setAspectRatio(saved.ratio);
    if (saved.withThumbnail !== undefined) setWithThumbnailAi(saved.withThumbnail);
    if (saved.bodyImages !== undefined) setBodyImages(saved.bodyImages);
    if (saved.autoImages !== undefined) setAutoImages(saved.autoImages);
    if (saved.interactive !== undefined) setInteractive(saved.interactive);
    if (saved.thumbnailText !== undefined) setThumbnailText(saved.thumbnailText);
    if (saved.tone) setTone(saved.tone);
    if (saved.style) setStyle(saved.style);
    if (saved.targetLength) setTargetLength(saved.targetLength);
    if (saved.personaId !== undefined) setPersonaId(saved.personaId);
    if (saved.humanStyle !== undefined) setHumanStyle(saved.humanStyle);
  }, []);

  const savePrefs = () => {
    const ok = saveGenPrefs(window.localStorage, { themeId: selectedTheme, ratio: aspectRatio, thumbnailText, withThumbnail: withThumbnailAi, bodyImages, autoImages, interactive, tone, style, targetLength, personaId, humanStyle }, PLACES_PREFS_KEY);
    setPrefsAt(ok ? prefsSavedAt(window.localStorage, PLACES_PREFS_KEY) : prefsAt);
    setPrefsNotice(ok ? "현재 설정값을 이 브라우저에 기본값으로 저장했습니다. 다음 접속부터 자동으로 적용됩니다." : "저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.");
  };

  const resetPrefs = () => {
    clearGenPrefs(window.localStorage, PLACES_PREFS_KEY);
    setPrefsAt(null);
    setSelectedTheme("green-orange");
    setAspectRatio("16:9");
    setWithThumbnailAi(true);
    setBodyImages(2);
    setAutoImages(true);
    setInteractive(false);
    setThumbnailText(false);
    setTone("해요체");
    setStyle("conversational");
    setTargetLength(2000);
    setPersonaId(null);
    setHumanStyle(true);
    setPrefsNotice("저장된 기본값을 지우고 처음 설정으로 되돌렸습니다.");
  };
  const [stepMsg, setStepMsg] = useState("");
  const [extraRequest, setExtraRequest] = useState("");

  // Output state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // 생성 결과·저장·이미지 편집은 세 탭 공통 작업공간을 쓴다
  const needKey = () => {
    setErrorMsg("이미지 모델에 필요한 API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 등록해주세요.");
    onOpenSettings();
  };
  const ws = useBlogWorkspace(settings, needKey);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessingFiles(true);
    try {
      const newPhotos: UploadedPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const p = await processImageFile(files[i]);
        if (photos.length === 0 && newPhotos.length === 0) {
          p.isThumbnail = true; // 첫 번째 사진 자동 썸네일 지정
        }
        newPhotos.push(p);
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err) {
      console.error(err);
      setErrorMsg("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingFiles(false);
      e.target.value = "";
    }
  };

  const handleSetThumbnail = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isThumbnail: p.id === id,
      }))
    );
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      if (filtered.length > 0 && !filtered.some((p) => p.isThumbnail)) {
        filtered[0].isThumbnail = true;
      }
      return filtered;
    });
  };

  // AI SEO Keyword Auto Extractor
  const handleExtractKeywords = async () => {
    const textMissing = missingKeyMessage("text", settings);
    if (textMissing) {
      setErrorMsg(textMissing);
      onOpenSettings();
      return;
    }
    if (!placeName.trim()) {
      setErrorMsg("키워드를 자동 추출할 장소명을 먼저 입력해주세요.");
      return;
    }

    setIsExtractingKeywords(true);
    setErrorMsg("");

    const currentYear = new Date().getFullYear();
    const system = "당신은 네이버 블로그 검색최적화(SEO) 및 키워드 분석 전문가입니다. 반드시 JSON 객체 하나만 응답합니다.";
    const user = `현재 연도: ${currentYear}년
장소명: ${placeName}
카테고리: ${category}
${region ? `지역: ${region}` : ""}
${oneLineImpression ? `특징/인상: ${oneLineImpression}` : ""}

네이버 검색창에서 검색량이 높고 클릭 전환율이 우수한 대표 검색 키워드 1개와 서브 연관 키워드 2~3개를 추천해주세요.
반드시 아래 JSON 형식으로만 응답하세요:
{
  "mainKeyword": "네이버 메인 검색 키워드 1개 (예: 성수동 브런치 카페)",
  "subKeywords": "서브 키워드 2~3개 쉼표 구분 (예: 성수역 감성 맛집, 성수 데이트 코스, 어반플랜트 주차)"
}`;

    try {
      const eng = resolveTextEngine(settings);
      const text = await callLlm({ provider: eng.provider, model: eng.model, apiKey: eng.apiKey, system, user, json: true, temperature: 0.5, maxTokens: 1024 });
      const parsed = parseJsonLoose<{ mainKeyword?: string; subKeywords?: string }>(text);
      if (!parsed || (!parsed.mainKeyword && !parsed.subKeywords)) throw new Error("키워드 응답을 읽지 못했습니다.");
      if (parsed.mainKeyword) setMainKeyword(String(parsed.mainKeyword).slice(0, 100));
      if (parsed.subKeywords) setSubKeywords(String(parsed.subKeywords).slice(0, 300));
    } catch (e) {
      setErrorMsg(`키워드 자동 추출 중 오류가 발생했습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"} (직접 입력도 가능합니다)`);
    } finally {
      setIsExtractingKeywords(false);
    }
  };

  // 사진·장소 정보를 보고 "떠올려 볼 질문"만 제안한다. 경험 내용은 만들지 않고, 본문에는 회원이 직접 쓴 경험만 반영한다.
  const handleExperienceHints = async () => {
    const textMissing = missingKeyMessage("text", settings);
    if (textMissing) {
      setErrorMsg(textMissing);
      onOpenSettings();
      return;
    }
    if (!placeName.trim()) {
      setErrorMsg("경험 질문을 받을 장소명을 먼저 입력해주세요.");
      return;
    }
    setHintsLoading(true);
    setErrorMsg("");
    try {
      const eng = resolveTextEngine(settings);
      const list = await requestExperienceQuestions({
        engine: { provider: eng.provider, model: eng.model, apiKey: eng.apiKey },
        context: `장소명: ${placeName}\n카테고리: ${category}\n${region ? `지역: ${region}\n` : ""}${oneLineImpression ? `한 줄 인상: ${oneLineImpression}` : ""}`,
        photos: photos.slice(0, 4).map((x) => ({ mime: x.mimeType, base64: x.base64 })),
        audience: "방문한 사람이 실제 경험을 떠올릴 수 있는",
      });
      setExperienceHints(list);
    } catch (e) {
      setErrorMsg(`경험 질문을 만들지 못했습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setHintsLoading(false);
    }
  };

  // Generate Post via Gemini Vision
  const handleGenerateVisionPost = async (persona?: BlogPersona) => {
    const textMissing = missingKeyMessage("text", settings);
    if (textMissing) {
      setErrorMsg(textMissing);
      onOpenSettings();
      return;
    }
    if (!placeName.trim()) {
      setErrorMsg("장소명을 입력해주세요 (예: 성수동 어반플랜트).");
      return;
    }
    const hasPhotos = photos.length > 0;
    // 사진이 없으면 AI 이미지로 만든다(키 확인). 사진이 있으면 사진이 우선이라 이미지 AI 키는 필요 없다.
    if (!hasPhotos && autoImages && (withThumbnailAi || bodyImages > 0)) {
      const imageMissing = missingKeyMessage("image", settings);
      if (imageMissing) {
        setErrorMsg(`${imageMissing} (또는 사진을 올리면 사진으로 글을 만듭니다.)`);
        onOpenSettings();
        return;
      }
    }

    setLoading(true);
    setErrorMsg("");
    ws.setErrorMsg("");
    setStepMsg("시작하는 중…");
    try {
      // 대표 사진을 맨 앞에 두고 최대 6장까지 사용한다(순서 = 이미지 컷 순서)
      const thumbIdx = Math.max(0, photos.findIndex((x) => x.isThumbnail));
      const used = hasPhotos ? [photos[thumbIdx], ...photos.filter((_, i) => i !== thumbIdx)].slice(0, 6) : [];
      const chosen = persona ?? BLOG_PERSONAS.find((x) => x.id === personaId) ?? null;
      const eng = resolveTextEngine(settings);
      const theme = COLOR_THEMES.find((t) => t.id === selectedTheme) || COLOR_THEMES[1];

      const context = [
        `- 최적화 모드: ${
          seoMode === "homefeed"
            ? "홈판 노출 모드 (감성 스토리텔링 & 1인칭 에세이 톤. 감각적인 첫 문단과 디테일한 무드, 감정선 중심의 서사)"
            : "기본 SEO 최적화 모드 (검색 1위 공략 정보형 리뷰. 매장 기본정보, 대표 메뉴 및 가격, 주차·대중교통 동선, 웨이팅 팁 등 검색 이용자에게 필수인 정보를 체계적으로)"
        }`,
        `- 장소명: ${placeName} (카테고리: ${category})`,
        region ? `- 지역/위치: ${region}` : "",
        visitDate ? `- 방문일: ${visitDate}` : "",
        companion ? `- 동행자: ${companion}` : "",
        oneLineImpression ? `- 한 줄 인상: ${oneLineImpression}` : "",
        placeDetails ? `- 상세 정보(회원이 직접 제공한 사실): ${placeDetails}` : "",
        includeFaq ? "- FAQ 섹션: 포함 (주차 팁, 웨이팅 방법, 추천 메뉴 등 자주 묻는 질문 3선)" : "- FAQ 섹션: 미포함",
      ].filter(Boolean).join("\n");

      const result = await runBlogPipeline({
        engine: { provider: eng.provider, model: eng.model, apiKey: eng.apiKey },
        topic: `${placeName} ${category} 방문 후기`,
        extraRequest,
        hint: (persona ? persona.defaultTopic : angleTopic).trim() || undefined,
        keywords: [mainKeyword, subKeywords, persona ? persona.defaultKeywords : personaKeywords].filter((k) => k.trim()).join(", "),
        purpose: (persona ? persona.defaultPurpose : purposeText).trim() || (seoMode === "homefeed" ? "네이버 홈판(MY피드) 노출을 노리는 감성 방문 후기" : "검색 상위 노출을 노리는 정보형 방문 후기"),
        persona: buildCustomPersona(chosen ? { name: chosen.name, badge: chosen.badge, tonePrompt: chosen.tonePrompt } : null, customPersonaText),
        humanStyle,
        experience,
        tone: persona ? persona.preferredTone : tone,
        style,
        targetLength,
        imageCount: hasPhotos ? used.length : (withThumbnailAi ? 1 : 0) + bodyImages,
        withThumbnail: hasPhotos ? true : withThumbnailAi,
        ratio: aspectRatio,
        themeId: selectedTheme,
        withInteractive: interactive,
        withThumbnailText: thumbnailText,
        photos: hasPhotos ? used.map((x) => ({ mime: x.mimeType, base64: x.base64 })) : undefined,
        thumbIndex: 0,
        role: hasPhotos
          ? "너는 대한민국 네이버 블로그 최상위 0.1% 맛집/카페/여행 전문 인플루언서이자 네이버 D.I.A+ & C-Rank 알고리즘 전문가다. 직접 방문해 사진을 찍어 온 '내돈내산' 블로거의 생생한 후기 스타일로 쓴다."
          : "너는 대한민국 네이버 블로그 최상위 0.1% 맛집/카페/여행 전문 인플루언서이자 네이버 D.I.A+ & C-Rank 알고리즘 전문가다. 회원이 제공한 방문 정보만 근거로 생생한 방문 후기 스타일로 쓰고, 제공되지 않은 메뉴·가격·맛은 지어내지 않는다.",
        extraContext: context,
        onStep: setStepMsg,
      });

      const finalSettings = { ...result.settings, ...(categoryId ? { categoryId } : {}), ...(naverCategory ? { naverCategory } : {}) };
      if (!hasPhotos) {
        // 사진이 없으면 AI 이미지 컷을 만든다(글이 먼저 저장되고, 자동 생성을 켰으면 이어서 이미지를 만든다).
        await ws.startFresh({ ...result, settings: finalSettings });
        if (autoImages && result.images.length) {
          setLoading(false);
          await ws.generateAll();
        }
        return;
      }
      // 올린 사진을 내 보관 폴더에 저장해 컷에 연결한다(대표 사진에는 선택 시 제목 글자 합성)
      const withUrls = [];
      for (let i = 0; i < result.images.length; i++) {
        setStepMsg(`사진 ${i + 1}/${result.images.length} 저장 중…`);
        let dataUrl = used[i].previewUrl;
        if (i === 0 && thumbnailText) dataUrl = await overlayThumbnailTitle(dataUrl, result.title, theme.color);
        withUrls.push({ ...result.images[i], url: await uploadImage(dataUrl) });
      }
      await ws.startFresh({ ...result, images: withUrls, settings: finalSettings });
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "비전 포스트 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setStepMsg("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Vision Upload Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              맛집/카페/여행 사진 분석 블로깅
            </h3>
            <p className="text-xs text-slate-500">
              사진을 업로드하면 AI가 멀티모달 분석을 통해 전문적인 블로그 포스트를 작성해 드립니다. 💡 사진을 클릭하면 대표 이미지(썸네일)로 설정됩니다.
            </p>
          </div>
        </div>

        <CategorySelect value={categoryId} onChange={setCategoryId} />
        <NaverCategoryPicker value={naverCategory} onChange={(c) => { setNaverCategory(c); saveLastNaverCategory(window.localStorage, c); }} disabled={loading} />

        {/* SEO Mode Selection (Homefeed vs Standard) */}
        <div className="bg-slate-50/90 rounded-xl border border-slate-200/90 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              SEO 최적화 모드 선택
            </span>
            <span className="text-[11px] text-slate-400">
              {seoMode === "homefeed"
                ? "네이버 MY피드/홈판 픽을 겨냥한 감성 스토리텔링"
                : "네이버 검색 1위 노출을 겨냥한 정보형 구조화"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSeoMode("homefeed")}
              className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                seoMode === "homefeed"
                  ? "bg-white border-emerald-500 ring-2 ring-emerald-400/30 shadow-xs"
                  : "bg-white/60 border-slate-200 hover:bg-white text-slate-600"
              }`}
            >
              <div
                className={`p-2 rounded-lg mt-0.5 ${
                  seoMode === "homefeed"
                    ? "bg-emerald-100 text-emerald-700 font-bold"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">홈판 노출 모드</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-100 text-emerald-700 rounded">
                    감성 스토리텔링
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  1인칭 감성 에세이 톤으로 여행/푸드/리빙 홈판 픽 및 소셜 공유를 극대화합니다.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSeoMode("standard")}
              className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                seoMode === "standard"
                  ? "bg-white border-indigo-500 ring-2 ring-indigo-400/30 shadow-xs"
                  : "bg-white/60 border-slate-200 hover:bg-white text-slate-600"
              }`}
            >
              <div
                className={`p-2 rounded-lg mt-0.5 ${
                  seoMode === "standard"
                    ? "bg-indigo-100 text-indigo-700 font-bold"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">기본 SEO 모드</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-indigo-100 text-indigo-700 rounded">
                    정보형 리뷰
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  메뉴, 가격, 주차, 웨이팅 등 검색 이용자 필수 정보로 D.I.A+ 점수를 극대화합니다.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Visit Information Form */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500" />
              <h4 className="text-xs font-bold text-slate-800">방문 정보</h4>
            </div>
            <span className="text-[10px] text-rose-500 font-semibold">* 필수 입력</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Place Name */}
            <div className="md:col-span-8">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                장소명 *
              </label>
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="예: 성수동 어반플랜트"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Category */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                카테고리
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="맛집">맛집</option>
                <option value="카페">카페</option>
                <option value="여행">여행</option>
                <option value="쇼핑">쇼핑</option>
                <option value="기타">기타</option>
              </select>
            </div>

            {/* Region */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                지역 (선택)
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: 서울 성수동"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Visit Date */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                방문일 (선택)
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              />
            </div>

            {/* Companion */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                동행 (선택)
              </label>
              <input
                type="text"
                value={companion}
                onChange={(e) => setCompanion(e.target.value)}
                placeholder="예: 연인 / 가족 / 친구"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* One Line Impression */}
            <div className="md:col-span-12">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                한 줄 인상 (선택)
              </label>
              <input
                type="text"
                value={oneLineImpression}
                onChange={(e) => setOneLineImpression(e.target.value)}
                placeholder="예: 평일 낮인데도 사람이 많고 분위기가 감성적이었다"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Place Details */}
            <div className="md:col-span-12">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                장소 상세 정보 (선택)
              </label>
              <textarea
                rows={3}
                value={placeDetails}
                onChange={(e) => setPlaceDetails(e.target.value)}
                placeholder="메뉴·가격·운영시간·주차·예약·시그니처·분위기 등 본문에 반영할 정보를 자유롭게 적어주세요. * 입력한 정보는 AI가 글에 자연스럽게 녹여내어 전문성을 높여줍니다."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>
          </div>

          {/* SEO Keywords Input & AI Auto Extraction */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800">SEO 키워드 설정 (선택)</h4>
              </div>
              <button
                type="button"
                onClick={handleExtractKeywords}
                disabled={isExtractingKeywords || !placeName.trim()}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition shadow-2xs"
              >
                {isExtractingKeywords ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>키워드 추출 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>AI 키워드 자동 추출</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  메인 타겟 키워드
                </label>
                <input
                  type="text"
                  value={mainKeyword}
                  onChange={(e) => setMainKeyword(e.target.value)}
                  placeholder="예: 성수동 브런치 카페, 강릉 감성숙소 등"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  서브 키워드 (쉼표 구분)
                </label>
                <input
                  type="text"
                  value={subKeywords}
                  onChange={(e) => setSubKeywords(e.target.value)}
                  placeholder="예: 성수역 맛집, 주말 데이트 코스, 내돈내산 추천"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 입력하지 않으셔도 업로드된 사진과 장소명을 분석하여 네이버 상위노출 키워드가 본문에 자동으로 자연스럽게 배치됩니다.
            </p>
          </div>
        </div>

        <GenerationPanel
          values={{ personaId, targetLength, keywords: personaKeywords, purpose: purposeText, tone, style }}
          onChange={(patch) => {
            if ("personaId" in patch) setPersonaId(patch.personaId ?? null);
            if (patch.targetLength !== undefined) setTargetLength(patch.targetLength);
            if (patch.purpose !== undefined) setPurposeText(patch.purpose);
            if (patch.keywords !== undefined) setPersonaKeywords(patch.keywords);
            if (patch.tone) setTone(patch.tone);
            if (patch.style) setStyle(patch.style);
          }}
          onLoadPersona={(p) => {
            setPersonaId(p.id);
            setTone(p.preferredTone);
            setAngleTopic(p.defaultTopic);
            setPurposeText(p.defaultPurpose);
            setPersonaKeywords(p.defaultKeywords);
          }}
          onInstant={(p) => {
            setPersonaId(p.id);
            setTone(p.preferredTone);
            setAngleTopic(p.defaultTopic);
            setPurposeText(p.defaultPurpose);
            setPersonaKeywords(p.defaultKeywords);
            void handleGenerateVisionPost(p);
          }}
          extra={
            <HumanStylePanel
              customPersona={customPersonaText}
              setCustomPersona={setCustomPersonaText}
              humanStyle={humanStyle}
              setHumanStyle={setHumanStyle}
              experience={experience}
              setExperience={setExperience}
              hints={experienceHints}
              hintsLoading={hintsLoading}
              onRequestHints={() => void handleExperienceHints()}
              disabled={loading}
              experienceTitle="실제 방문 경험 (선택)"
              experienceHelp="본문에 녹일 실제 방문 경험·감정·에피소드를 직접 적어 주세요. 적은 내용만 사실로 반영하며, AI가 경험을 대신 만들지 않습니다."
              experiencePlaceholder="예: 평일 점심에 갔는데도 대기가 30분 정도 있었다. 처음엔 그냥 그런가 했는데 디저트 한입 먹고 이해됐다."
            />
          }
          topic={angleTopic}
          setTopic={setAngleTopic}
          topicLabel="특정 주제 · 글의 관점 (선택 — 장소명은 방문 정보에서 입력)"
          topicPlaceholder="예: 감성 카페 방문 후기를 20대 에디터 관점으로"
          disabled={loading}
        />

        {/* 방문 사진(이미지): 글 생성 설정(페르소나) 다음, 이미지 모델 설정 앞 — 아이디어 탭의 흐름과 같게 */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800">방문 사진 (선택)</h4>
            </div>
            <span className="text-[10px] text-slate-500">사진을 올리면 사진으로 글을 만들고, 없으면 아래 이미지 옵션으로 AI 이미지를 만듭니다</span>
          </div>
          {/* Drag & Drop Upload Zone */}
          <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-6 text-center transition cursor-pointer group">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                클릭하거나 사진을 이곳으로 드래그하세요
              </p>
              <p className="text-[11px] text-slate-500">
                여러 장의 사진을 한 번에 선택할 수 있습니다 (스마트폰 촬영 원본 고화질 지원)
              </p>
            </div>
          </div>

          {/* Uploaded Photos Grid */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  업로드된 사진 ({photos.length}장)
                </span>
                <span className="text-slate-400 text-[11px]">
                  별 아이콘 사진이 대표 썸네일로 설정됩니다
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {photos.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => handleSetThumbnail(p.id)}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition group shadow-2xs ${
                      p.isThumbnail
                        ? "border-amber-500 ring-2 ring-amber-400/30"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <img
                      src={p.previewUrl}
                      alt={p.name}
                      className="w-full h-24 object-cover"
                    />
                    {/* Photo Index Badge */}
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-slate-900/80 text-white rounded-md">
                      사진 {idx + 1}
                    </span>

                    {/* Thumbnail Star Badge */}
                    {p.isThumbnail && (
                      <span className="absolute top-1.5 right-1.5 p-1 bg-amber-500 text-white rounded-full shadow-xs">
                        <Star className="w-3 h-3 fill-current" />
                      </span>
                    )}

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(p.id);
                      }}
                      className="absolute bottom-1.5 right-1.5 p-1 bg-slate-900/70 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 모델 · 디자인 · 이미지 설정 (아이디어 탭과 같은 하늘색 박스) */}
        <div className="rounded-2xl border-2 border-sky-300 bg-sky-50/50 p-5 space-y-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-sky-200 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-white text-sm">🎨</span>
            <h3 className="text-sm font-extrabold text-sky-950">AI 모델 · 디자인 · 이미지 설정</h3>
            <span className="text-[11px] text-sky-700/80">글 AI, 컬러 테마, 이미지 옵션을 정하고 [설정값 저장]으로 기본값으로 남길 수 있습니다</span>
          </div>

  <ModelSettingsCard settings={settings} onSettingsChange={onSettingsChange} onOpenSettings={onOpenSettings} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 왼쪽: 컬러 테마 + 추가 요청 */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-indigo-600" />컬러 테마</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COLOR_THEMES.map((t) => (
                    <button key={t.id} type="button" onClick={() => setSelectedTheme(t.id)} className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${selectedTheme === t.id ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"}`}>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-3.5 h-3.5 rounded-full shadow-2xs" style={{ backgroundColor: t.color }} />
                        <span className="w-2.5 h-2.5 rounded-full shadow-2xs opacity-80" style={{ backgroundColor: t.subColor }} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-slate-900 leading-tight">{t.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">추가 요청사항 (선택)</label>
                <textarea rows={3} value={extraRequest} onChange={(e) => setExtraRequest(e.target.value)} placeholder="예: 분위기를 더 감성적으로 묘사해줘, 메뉴 가격 정보를 강조해줘 등" className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed" />
              </div>
            </div>

            {/* 오른쪽: 고급 옵션 (아이디어 탭과 같은 구성 + 맛집 고유 FAQ) */}
            <div className="lg:col-span-5 bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Settings2 className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold text-slate-800">고급 옵션</h4>
              </div>
              <p className="text-[11px] leading-4 text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-2">📷 사진을 올리면 올린 사진으로 글을 만듭니다(AI 이미지 옵션은 적용되지 않음). 사진이 없을 때만 아래 AI 이미지 옵션으로 이미지를 생성합니다.</p>

              <div className="space-y-3">
                <label onClick={() => setWithThumbnailAi(!withThumbnailAi)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                  {withThumbnailAi ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-bold text-slate-800">대표 이미지 생성</div>
                    <p className="text-[11px] text-slate-500">사진이 없을 때, 방문 후기에 맞는 AI 이미지를 실제로 생성해 맨 위에 넣습니다.</p>
                  </div>
                </label>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">본문 이미지 수</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 1, 2, 3, 4].map((n) => <button key={n} type="button" onClick={() => setBodyImages(n)} className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${bodyImages === n ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`}>{n === 0 ? "없음" : `${n}장`}</button>)}
                  </div>
                </div>

                <label onClick={() => setAutoImages(!autoImages)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                  {autoImages ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-bold text-slate-800">글 완성 후 이미지 자동 생성</div>
                    <p className="text-[11px] text-slate-500">끄면 글만 먼저 만들고, 이미지는 컷마다 직접 생성합니다.</p>
                  </div>
                </label>

                <label onClick={() => setThumbnailText(!thumbnailText)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                  {thumbnailText ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-bold text-slate-800">썸네일에 제목 글자 넣기</div>
                    <p className="text-[11px] text-slate-500">대표 이미지 아래쪽에 제목을 또렷하게 합성합니다(글자는 AI가 아니라 직접 그립니다).</p>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">이미지 비율</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {IMAGE_RATIOS.map((r) => <button key={r.value} type="button" onClick={() => setAspectRatio(r.value)} className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${aspectRatio === r.value ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`}>{r.value}</button>)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-3">
                <label onClick={() => setInteractive(!interactive)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                  {interactive ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-bold text-slate-800">인터랙티브 요소 추가</div>
                    <p className="text-[11px] text-slate-500">독자가 직접 체크하거나 따져 볼 수 있는 목록·자가진단을 넣습니다.</p>
                  </div>
                </label>
                <label onClick={() => setIncludeFaq(!includeFaq)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                  {includeFaq ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-bold text-slate-800">FAQ 섹션 포함 <span className="text-[10px] font-semibold text-emerald-700">(맛집 전용)</span></div>
                    <p className="text-[11px] text-slate-500">포스트 하단에 주차, 예약 등 자주 묻는 질문과 답변(FAQ) 섹션을 자동 생성합니다.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-200 pt-4">
            <p className="text-[11px] text-sky-900/80">
              {prefsNotice || (prefsAt ? `저장된 기본값이 있습니다 (${new Date(prefsAt).toLocaleString("ko-KR")}). 접속할 때 자동 적용됩니다.` : "아직 저장한 기본값이 없습니다. 자주 쓰는 설정을 저장해 두면 다음부터 바로 적용됩니다.")}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={resetPrefs} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
                <RotateCcw className="w-3.5 h-3.5" /> 초기화
              </button>
              <button type="button" onClick={savePrefs} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-700">
                <Save className="w-3.5 h-3.5" /> 설정값 저장
              </button>
            </div>
          </div>
        </div>

        {/* Error Msg */}
        {(errorMsg || ws.errorMsg) && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg || ws.errorMsg}</span>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={() => void handleGenerateVisionPost()}
          disabled={loading || processingFiles}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-md shadow-emerald-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{stepMsg || "사진을 관찰하고 원고를 작성 중…"}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>핫플 블로그 포스트 생성하기</span>
            </>
          )}
        </button>
      </div>

      {/* 생성 결과: 세 탭 공통 결과 화면(검수·사진 컷·편집·복사·보관함 자동 저장) */}
      {ws.post && <PostWorkspaceView ws={ws} locked={loading} onOpenLibrary={onOpenLibrary} />}
    </div>
  );
}
