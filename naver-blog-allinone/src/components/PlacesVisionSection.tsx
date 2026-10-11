"use client";

import React, { useState } from "react";
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

interface PlacesVisionSectionProps {
  settings: AppSettings;
  onOpenSettings: () => void;
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

export function PlacesVisionSection({ settings, onOpenSettings }: PlacesVisionSectionProps) {
  // Photos state
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [processingFiles, setProcessingFiles] = useState(false);

  // SEO Optimization Mode
  const [seoMode, setSeoMode] = useState<"homefeed" | "standard">("homefeed");

  // SEO Keywords
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
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "1:1">("16:9");
  const [humanStyle, setHumanStyle] = useState<"default" | "typeA" | "typeB">("typeA");
  const [extraRequest, setExtraRequest] = useState("");

  // Output state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedResult, setGeneratedResult] = useState<{
    title: string;
    summary: string;
    contentHtml: string;
    markdown: string;
    plainText: string;
    tags: string[];
    thumbnailUrl?: string;
  } | null>(null);

  const [resultTab, setResultTab] = useState<"naver" | "markdown" | "text">("naver");
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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
    if (!settings.geminiApiKey) {
      setErrorMsg("Google Gemini API 키가 필요합니다. 상단 [설정]에서 본인 키를 등록해주세요.");
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
    const prompt = `당신은 네이버 블로그 검색최적화(SEO) 및 키워드 분석 전문가입니다.
현재 연도: ${currentYear}년
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
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.textModel}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.5,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) throw new Error("키워드 추출 호출 실패");
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText);

      if (parsed.mainKeyword) setMainKeyword(parsed.mainKeyword);
      if (parsed.subKeywords) setSubKeywords(parsed.subKeywords);
    } catch {
      setErrorMsg("키워드 자동 추출 중 오류가 발생했습니다. 직접 입력해주세요.");
    } finally {
      setIsExtractingKeywords(false);
    }
  };

  // Generate Post via Gemini Vision
  const handleGenerateVisionPost = async () => {
    if (!settings.geminiApiKey) {
      setErrorMsg("Google Gemini API 키가 필요합니다. 상단 [설정]에서 본인 키를 등록해주세요.");
      onOpenSettings();
      return;
    }

    if (!placeName.trim()) {
      setErrorMsg("장소명을 입력해주세요 (예: 성수동 어반플랜트).");
      return;
    }

    if (photos.length === 0) {
      setErrorMsg("최소 1장 이상의 방문 사진을 업로드해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const currentYear = new Date().getFullYear(); // 2026
    const chosenTheme = COLOR_THEMES.find((t) => t.id === selectedTheme) || COLOR_THEMES[1];

    // Build Vision parts
    const parts: unknown[] = [];

    // 1. Add image inline parts
    photos.forEach((p) => {
      parts.push({
        inline_data: {
          mime_type: p.mimeType,
          data: p.base64,
        },
      });
    });

    // 2. Add text prompt part
    const promptText = `당신은 대한민국 네이버 블로그 최상위 0.1% 맛집/카페/여행 전문 인플루언서이자 네이버 D.I.A+ & C-Rank 알고리즘 전문가입니다.
현재 연도는 반드시 ${currentYear}년입니다. 과거 연도(2023, 2024 등)로 후퇴하지 말고 모든 정보와 방문 시점은 ${currentYear}년 기준입니다.

업로드된 ${photos.length}장의 사진을 순서대로 정밀 관찰하세요.
- 사진 1부터 사진 ${photos.length}까지 각 사진 속 음식의 비주얼, 플레이팅, 재료, 식감, 매장의 조명과 인테리어 톤, 좌석 분위기, 소품 디테일을 직접 두 눈으로 본 것처럼 구체적으로 묘사하세요.
- AI가 지어낸 뻔한 글이 아니라, 진짜 블로거가 '내돈내산'으로 직접 방문하여 감탄하고 즐긴 생생한 찐후기 스타일로 작성해야 합니다.

[최적화 모드 및 검색 타겟팅]
- 최적화 모드: ${
      seoMode === "homefeed"
        ? "홈판 노출 모드 (감성 스토리텔링 & 1인칭 에세이 톤. 네이버 MY피드/리빙/푸드/여행 홈판 픽 유도. 감각적인 첫 문단과 디테일한 무드, 감정선 중심의 매력적인 서사)"
        : "기본 SEO 최적화 모드 (검색 1위 공략 정보형 리뷰. 매장 기본정보, 대표 메뉴 및 가격, 주차 및 대중교통 동선, 웨이팅 꿀팁, 브레이크타임 등 검색 이용자에게 필수적인 핵심 정보 체계적 구성)"
    }
${mainKeyword ? `- 메인 공략 키워드: ${mainKeyword} (제목 및 본문 주요 문맥에 자연스럽게 배치)` : ""}
${subKeywords ? `- 서브 키워드: ${subKeywords}` : ""}

[방문 메타 정보]
- 장소명: ${placeName} (카테고리: ${category})
${region ? `- 지역/위치: ${region}` : ""}
${visitDate ? `- 방문일: ${visitDate}` : ""}
${companion ? `- 동행자: ${companion}` : ""}
${oneLineImpression ? `- 한 줄 인상: ${oneLineImpression}` : ""}
${placeDetails ? `- 상세 정보: ${placeDetails}` : ""}
${extraRequest ? `- 추가 요청: ${extraRequest}` : ""}

[옵션 및 서식]
- 컬러 테마: ${chosenTheme.name} (포인트 색상: ${chosenTheme.color})
- FAQ 섹션: ${includeFaq ? "포함 (주차 팁, 웨이팅 방법, 추천 메뉴 등 자주 묻는 질문 3선)" : "미포함"}
- 글쓰기 스타일: ${
      humanStyle === "typeA"
        ? "유형 A (친근하고 발랄한 대화체, 감성적 표현과 풍부한 이모지)"
        : humanStyle === "typeB"
        ? "유형 B (신뢰감 있고 꼼꼼한 정보형, 메뉴 가격과 동선을 꼼꼼히 짚어주는 톤)"
        : "기본 톤"
    }

[네이버 스마트에디터 ONE 서식 가이드]
- 각 사진이 들어갈 자리를 본문 흐름에 맞추어 명확히 배치하세요:
  예: <!-- [사진 1 삽입 위치: 사진 속 묘사] -->
- 소제목은 <h3 style="color: ${chosenTheme.color}; font-weight: bold; border-left: 4px solid ${chosenTheme.color}; padding-left: 8px; margin: 24px 0 12px 0;"> 태그 사용
- 인용구/강조박스는 <blockquote style="background: #f8fafc; border-left: 4px solid ${chosenTheme.color}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"> 태그 사용
- 본문 문단은 <p style="line-height: 1.8; margin-bottom: 14px; font-size: 15px; color: #1e293b;">

반드시 아래 JSON 형식으로만 응답하세요. 마크다운 따옴표 없이 순수 JSON만 반환:
{
  "title": "${currentYear}년 감성 듬뿍 네이버 상위노출 핫플 포스트 제목",
  "summary": "검색 결과에 노출될 매력적인 2줄 스니펫 요약",
  "contentHtml": "네이버 스마트에디터 ONE에 붙여넣기 가능한 인라인 스타일 HTML 코드",
  "markdown": "티스토리 및 워드프레스에 복사할 수 있는 마크다운 본문",
  "plainText": "일반 텍스트 버전 본문",
  "tags": ["${placeName.replace(/\s+/g, "")}", "${category}", "핫플추천", "내돈내산", "데이트코스"]
}`;

    parts.push({ text: promptText });

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.textModel}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Gemini Vision 호출에 실패했습니다.");
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText);

      const thumb = photos.find((p) => p.isThumbnail) || photos[0];

      setGeneratedResult({
        title: parsed.title || `${placeName} 방문 솔직 후기`,
        summary: parsed.summary || "",
        contentHtml: parsed.contentHtml || "",
        markdown: parsed.markdown || parsed.plainText || "",
        plainText: parsed.plainText || "",
        tags: parsed.tags || [],
        thumbnailUrl: thumb?.previewUrl,
      });
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "비전 포스트 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyHtmlToClipboard = async () => {
    if (!generatedResult?.contentHtml) return;
    try {
      const blobHtml = new Blob([generatedResult.contentHtml], { type: "text/html" });
      const blobText = new Blob([generatedResult.plainText || generatedResult.contentHtml], {
        type: "text/plain",
      });
      const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
      await navigator.clipboard.write(data);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch {
      await navigator.clipboard.writeText(generatedResult.contentHtml);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    }
  };

  const copyMarkdownToClipboard = async () => {
    if (!generatedResult?.markdown) return;
    await navigator.clipboard.writeText(generatedResult.markdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const copyTextToClipboard = async () => {
    if (!generatedResult?.plainText) return;
    await navigator.clipboard.writeText(generatedResult.plainText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
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
        </div>

        {/* SEO Keywords Input & AI Auto Extraction */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
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

        {/* Color Theme & Advanced Options */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
            <Palette className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-800">컬러 테마 및 고급 옵션</h4>
          </div>

          {/* Theme Palette Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {COLOR_THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                    isSelected
                      ? "border-indigo-600 bg-white ring-2 ring-indigo-400/40 shadow-xs"
                      : "border-slate-200 bg-white/70 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-2xs"
                      style={{ backgroundColor: theme.color }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-2xs opacity-80"
                      style={{ backgroundColor: theme.subColor }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">{theme.name}</span>
                </button>
              );
            })}
          </div>

          {/* Options Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div className="space-y-3">
              <label
                onClick={() => setIncludeFaq(!includeFaq)}
                className="flex items-start gap-2.5 cursor-pointer text-xs group"
              >
                {includeFaq ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-800">FAQ 섹션 포함</div>
                  <p className="text-[11px] text-slate-500">
                    포스트 하단에 주차, 예약 등 자주 묻는 질문과 답변(FAQ) 섹션을 자동 생성합니다.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setThumbnailText(!thumbnailText)}
                className="flex items-start gap-2.5 cursor-pointer text-xs group"
              >
                {thumbnailText ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-800">썸네일용 텍스트 추가</div>
                  <p className="text-[11px] text-slate-500">
                    대표 이미지에 클릭을 유도하는 제목 카피를 안내합니다.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  대표 이미지/썸네일 비율
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio("16:9")}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                      aspectRatio === "16:9"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    16:9 (와이드)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("1:1")}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                      aspectRatio === "1:1"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    1:1 (정사각형)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  인간적인 글쓰기 스타일 PRO
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHumanStyle("default")}
                    className={`py-1 text-xs font-semibold rounded-lg border transition ${
                      humanStyle === "default"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    기본
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumanStyle("typeA")}
                    className={`py-1 text-xs font-semibold rounded-lg border transition ${
                      humanStyle === "typeA"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    유형 A (친근)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumanStyle("typeB")}
                    className={`py-1 text-xs font-semibold rounded-lg border transition ${
                      humanStyle === "typeB"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    유형 B (전문)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Extra Request */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              추가 요청사항 (선택)
            </label>
            <input
              type="text"
              value={extraRequest}
              onChange={(e) => setExtraRequest(e.target.value)}
              placeholder="예: 분위기를 더 감성적으로 묘사해줘, 메뉴 가격 정보를 강조해줘 등"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Error Msg */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerateVisionPost}
          disabled={loading || processingFiles}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-md shadow-emerald-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Gemini 비전이 사진을 관찰하고 네이버 상위노출 원고 작성 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>핫플 블로그 포스트 생성하기</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Result Output */}
      {generatedResult && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                  비전 분석 포스트 완성
                </span>
                <span className="text-xs text-slate-500">
                  {new Date().getFullYear()}년 네이버 플레이스 및 D.I.A+ 알고리즘 완벽 반영
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {generatedResult.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://blog.naver.com/GoBlogWrite.naver"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg transition"
              >
                <span>네이버 글쓰기 열기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={copyHtmlToClipboard}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs"
              >
                {copiedHtml ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>서식 복사됨!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>네이버 스마트에디터 ONE 서식 복사</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={copyMarkdownToClipboard}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition"
              >
                {copiedMarkdown ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>마크다운 복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>마크다운 복사 (티스토리·워드프레스)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={copyTextToClipboard}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>텍스트 복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>텍스트만 복사</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Thumbnail preview */}
          {generatedResult.thumbnailUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-w-lg mx-auto">
              <img
                src={generatedResult.thumbnailUrl}
                alt="대표 썸네일"
                className="w-full h-auto object-cover"
              />
              <div className="p-2 text-center text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
                선택된 대표 썸네일 사진 · 네이버 블로그 스마트에디터 첫 번째 이미지로 삽입하세요
              </div>
            </div>
          )}

          {/* Meta Summary & Tags */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-slate-600">검색 스니펫 요약:</span>
              <p className="text-xs text-slate-700 mt-0.5">{generatedResult.summary}</p>
            </div>

            {generatedResult.tags && generatedResult.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600 mr-1">추천 태그:</span>
                {generatedResult.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs font-medium bg-white text-emerald-700 border border-slate-200 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3-Way Format Preview Container */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              {/* Tab Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setResultTab("naver")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                    resultTab === "naver"
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  네이버 블로그 (HTML 서식)
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab("markdown")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                    resultTab === "markdown"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  마크다운 (티스토리·워드프레스)
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab("text")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                    resultTab === "text"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  일반 텍스트
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                {resultTab === "naver"
                  ? "상단 [서식 복사] 후 스마트에디터에 붙여넣기(Ctrl+V)하시면 서식이 유지됩니다."
                  : resultTab === "markdown"
                  ? "마크다운 지원 블로그(티스토리, 워드프레스, 깃허브 등)에 붙여넣기하세요."
                  : "일반 텍스트 형태로 메모장이나 SNS에 바로 활용하세요."}
              </span>
            </div>

            {/* Tab 1: Naver Rich HTML Preview */}
            {resultTab === "naver" && (
              <div
                className="prose prose-slate max-w-none text-xs sm:text-sm"
                dangerouslySetInnerHTML={{ __html: generatedResult.contentHtml }}
              />
            )}

            {/* Tab 2: Markdown Preview */}
            {resultTab === "markdown" && (
              <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                {generatedResult.markdown}
              </pre>
            )}

            {/* Tab 3: Plain Text Preview */}
            {resultTab === "text" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                {generatedResult.plainText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
