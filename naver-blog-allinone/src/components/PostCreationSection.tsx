"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Palette,
  Settings2,
  CheckSquare,
  Square,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { AppSettings } from "@/lib/storage";

interface PostCreationSectionProps {
  topic: string;
  setTopic: (topic: string) => void;
  extraPromptHint?: string;
  settings: AppSettings;
  onOpenSettings: () => void;
}

const COLOR_THEMES = [
  {
    id: "blue-gray",
    name: "블루-그레이",
    desc: "차분하고 전문적인 느낌",
    color: "#3b82f6",
    subColor: "#64748b",
  },
  {
    id: "green-orange",
    name: "그린-오렌지",
    desc: "활기차고 친근한 느낌",
    color: "#10b981",
    subColor: "#f97316",
  },
  {
    id: "purple-yellow",
    name: "퍼플-옐로우",
    desc: "세련되고 창의적인 느낌",
    color: "#8b5cf6",
    subColor: "#eab308",
  },
  {
    id: "teal-lightgray",
    name: "틸-라이트그레이",
    desc: "안정적이고 현대적인 느낌",
    color: "#14b8a6",
    subColor: "#94a3b8",
  },
  {
    id: "terracotta-lightgray",
    name: "테라코타-라이트그레이",
    desc: "따뜻하고 편안한 느낌",
    color: "#e07a5f",
    subColor: "#94a3b8",
  },
  {
    id: "classic-blue",
    name: "클래식 블루",
    desc: "신뢰할 수 있고 안정적인 느낌",
    color: "#1d4ed8",
    subColor: "#3b82f6",
  },
  {
    id: "nature-green",
    name: "네이처 그린",
    desc: "생기 있고 조화로운 느낌",
    color: "#15803d",
    subColor: "#22c55e",
  },
];

export function PostCreationSection({
  topic,
  setTopic,
  extraPromptHint,
  settings,
  onOpenSettings,
}: PostCreationSectionProps) {
  // Option states
  const [selectedTheme, setSelectedTheme] = useState("blue-gray");
  const [extraRequest, setExtraRequest] = useState("");
  const [includeThumbnail, setIncludeThumbnail] = useState(true);
  const [includeSubImages, setIncludeSubImages] = useState(true);
  const [thumbnailText, setThumbnailText] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "1:1">("16:9");
  const [includeInteractive, setIncludeInteractive] = useState(false);
  const [humanWritingStyle, setHumanWritingStyle] = useState<"default" | "typeA" | "typeB">("default");

  // Output states
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedPost, setGeneratedPost] = useState<{
    title: string;
    contentHtml: string;
    markdown: string;
    plainText: string;
    tags: string[];
    summary: string;
    thumbnailUrl?: string;
  } | null>(null);

  const [resultTab, setResultTab] = useState<"naver" | "markdown" | "text">("naver");
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const handleGeneratePost = async () => {
    if (!settings.geminiApiKey) {
      setErrorMsg("Google Gemini API 키가 필요합니다. 상단 [설정]에서 본인 키를 등록해주세요.");
      onOpenSettings();
      return;
    }
    if (!topic.trim()) {
      setErrorMsg("블로그 주제를 입력하거나 상단에서 주제를 선택해주세요.");
      return;
    }

    setGenerating(true);
    setErrorMsg("");

    const currentYear = new Date().getFullYear(); // 2026
    const chosenTheme = COLOR_THEMES.find((t) => t.id === selectedTheme) || COLOR_THEMES[0];

    const prompt = `당신은 대한민국 네이버 블로그 최상위 0.1% 파워블로거이자 SEO 전문 작가입니다.
현재 연도는 반드시 ${currentYear}년입니다. 과거 연도(2023, 2024 등)로 후퇴하지 말고 모든 시점과 트렌드는 ${currentYear}년 최신 기준으로 작성하세요.

[요청 사항]
1. 주제: ${topic}
${extraPromptHint ? `2. 기획 배경/의도: ${extraPromptHint}` : ""}
${extraRequest ? `3. 추가 요청사항: ${extraRequest}` : ""}
4. 컬러 테마: ${chosenTheme.name} (포인트 색상: ${chosenTheme.color})
5. 인터랙티브 요소 포함 여부: ${includeInteractive ? "포함 (독자가 직접 체크하거나 계산할 수 있는 참여형 체크리스트/비교표/자가진단)" : "미포함"}
6. 글쓰기 스타일: ${
      humanWritingStyle === "typeA"
        ? "유형 A (친근하고 발랄한 대화체, 이모지와 실제 경험담이 풍부한 일상형 블로거)"
        : humanWritingStyle === "typeB"
        ? "유형 B (신뢰감 있고 꼼꼼한 정보 전달형 전문가, 핵심을 조목조목 짚어주는 멘토 톤)"
        : "기본 (적절한 친근함과 전문성이 공존하는 네이버 블로그 최적화 톤)"
    }

[네이버 스마트에디터 ONE 서식 가이드]
- 글자 수: 공백 제외 2,000자 이상의 풍부하고 깊이 있는 본문
- 구성: 도입부 (공감과 문제 제기) ➔ 본문 1~4 (소제목, 핵심 노하우, 구체적 수치 및 사례) ➔ 실전 팁/주의사항 ➔ 맺음말 및 독자 소통
- HTML 태그:
  - 소제목: <h3> 태그에 style="color: ${chosenTheme.color}; font-weight: bold; border-left: 4px solid ${chosenTheme.color}; padding-left: 8px; margin: 24px 0 12px 0;"
  - 인용구/강조박스: <blockquote> 태그에 style="background: #f8fafc; border-left: 4px solid ${chosenTheme.color}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"
  - 본문 문단: <p style="line-height: 1.8; margin-bottom: 14px; font-size: 15px; color: #1e293b;">
  - 이미지 배치 위치 표시: <!-- [사진 1: 설명] --> 형식으로 본문 맥락에 2~3개 자연스럽게 삽입

반드시 아래 JSON 형식으로만 응답하세요. 마크다운 따옴표 없이 순수 JSON만 반환:
{
  "title": "${currentYear}년 기준 클릭률 극대화 네이버 상위노출 포스트 제목",
  "summary": "네이버 검색결과 스니펫에 노출될 2줄 메타 요약",
  "contentHtml": "네이버 스마트에디터 ONE에 붙여넣기 가능한 인라인 스타일이 적용된 HTML 코드",
  "markdown": "티스토리 및 워드프레스에 붙여넣을 수 있는 정돈된 마크다운 본문",
  "plainText": "일반 텍스트 버전 본문",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
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
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Gemini API 호출에 실패했습니다.");
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText);

      // 대표 이미지(썸네일) URL 자동 생성 (Pollinations / Unsplash 키워드 기반 고화질)
      let thumbUrl: string | undefined = undefined;
      if (includeThumbnail) {
        const imagePrompt = encodeURIComponent(
          `${parsed.tags?.[0] || topic}, professional aesthetic photography, modern clean lifestyle, high resolution, 4k`
        );
        const w = aspectRatio === "16:9" ? 1280 : 1080;
        const h = aspectRatio === "16:9" ? 720 : 1080;
        thumbUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=${w}&height=${h}&nologo=true`;
      }

      setGeneratedPost({
        title: parsed.title || topic,
        contentHtml: parsed.contentHtml || "",
        markdown: parsed.markdown || parsed.plainText || "",
        plainText: parsed.plainText || "",
        tags: parsed.tags || [],
        summary: parsed.summary || "",
        thumbnailUrl: thumbUrl,
      });
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "포스트 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const copyHtmlToClipboard = async () => {
    if (!generatedPost?.contentHtml) return;
    try {
      // 클립보드에 HTML과 텍스트 동시 복사 (스마트에디터 ONE에 붙여넣기 시 서식 완벽 보존)
      const blobHtml = new Blob([generatedPost.contentHtml], { type: "text/html" });
      const blobText = new Blob([generatedPost.plainText || generatedPost.contentHtml], {
        type: "text/plain",
      });
      const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
      await navigator.clipboard.write(data);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch {
      // Fallback
      await navigator.clipboard.writeText(generatedPost.contentHtml);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    }
  };

  const copyMarkdownToClipboard = async () => {
    if (!generatedPost?.markdown) return;
    await navigator.clipboard.writeText(generatedPost.markdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const copyTextToClipboard = async () => {
    if (!generatedPost?.plainText) return;
    await navigator.clipboard.writeText(generatedPost.plainText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Post Creation Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">포스트 생성하기</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Inputs) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Topic Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                블로그 주제
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 2026년 최고의 AI 생산성 도구 5가지"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Color Theme Palette */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                컬러 테마
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COLOR_THEMES.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-2xs"
                          style={{ backgroundColor: theme.color }}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shadow-2xs opacity-80"
                          style={{ backgroundColor: theme.subColor }}
                        />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {theme.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {theme.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extra Request Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                기사에 반영할 추가 요청사항
              </label>
              <textarea
                rows={3}
                value={extraRequest}
                onChange={(e) => setExtraRequest(e.target.value)}
                placeholder="예: 글 마지막에 이웃 소통 질문과 행동 촉구 문구를 추가해주세요."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column (Advanced Options Card) */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Settings2 className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold text-slate-800">고급 옵션</h4>
            </div>

            {/* Image Checkboxes */}
            <div className="space-y-3">
              <label
                onClick={() => setIncludeThumbnail(!includeThumbnail)}
                className="flex items-start gap-2.5 cursor-pointer text-xs group"
              >
                {includeThumbnail ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>대표 이미지 생성</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-md">
                      {settings.imageModel === "nano-banana-2" ? "Nano Banana 2" : "NB 2 Lite"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    포스트 주제에 딱 맞는 고품질 AI 이미지를 생성합니다.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setIncludeSubImages(!includeSubImages)}
                className="flex items-start gap-2.5 cursor-pointer text-xs group"
              >
                {includeSubImages ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-800">본문 서브 이미지 추가 (2~3장)</div>
                  <p className="text-[11px] text-slate-500">
                    글 중간중간 맥락에 맞는 이미지를 배치하여 가독성을 높입니다.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setThumbnailText(!thumbnailText)}
                className="flex items-start gap-2.5 cursor-pointer text-xs group"
              >
                {thumbnailText ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-800">썸네일용 텍스트 추가 (대표 이미지)</div>
                  <p className="text-[11px] text-slate-500">
                    이미지 위에 클릭을 유도하는 제목 텍스트를 합성합니다.
                  </p>
                </div>
              </label>
            </div>

            {/* Aspect Ratio */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                이미지 비율 ({settings.imageModel === "nano-banana-2" ? "Nano Banana 2" : "NB 2 Lite"})
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
                  16:9 와이드
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
                  1:1 정사각형
                </button>
              </div>
            </div>

            {/* Interactive Elements Toggle */}
            <div className="pt-2 border-t border-slate-200">
              <label
                onClick={() => setIncludeInteractive(!includeInteractive)}
                className="flex items-start gap-2.5 cursor-pointer text-xs group"
              >
                {includeInteractive ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-800">인터랙티브 요소 추가</div>
                  <p className="text-[11px] text-slate-500">
                    계산기, 대화형 퀴즈, 체크리스트 등 독자가 참여할 수 있는 요소를 포함합니다.
                  </p>
                </div>
              </label>
            </div>

            {/* Human Writing Style (PRO) */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700">
                  인간적인 글쓰기 스타일 (GEMS V3.0)
                </label>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-400 text-slate-900 rounded-md">
                  PRO
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setHumanWritingStyle("default")}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    humanWritingStyle === "default"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  기본
                </button>
                <button
                  type="button"
                  onClick={() => setHumanWritingStyle("typeA")}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    humanWritingStyle === "typeA"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  유형 A (친근)
                </button>
                <button
                  type="button"
                  onClick={() => setHumanWritingStyle("typeB")}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    humanWritingStyle === "typeB"
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

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGeneratePost}
          disabled={generating}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>네이버 상위노출 최적화 포스트 원고 및 서식 생성 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>블로그 포스트 생성하기</span>
            </>
          )}
        </button>
      </div>

      {/* Output Viewer Section */}
      {generatedPost ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                  생성 완료
                </span>
                <span className="text-xs text-slate-500">
                  {new Date().getFullYear()}년 최신 네이버 D.I.A+ 알고리즘 반영
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {generatedPost.title}
              </h2>
            </div>

            {/* Action buttons */}
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
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition"
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
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
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

          {/* Thumbnail preview if available */}
          {generatedPost.thumbnailUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-w-xl mx-auto">
              <img
                src={generatedPost.thumbnailUrl}
                alt={generatedPost.title}
                className="w-full h-auto object-cover"
              />
              <div className="p-2.5 text-center text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
                대표 썸네일 이미지 ({aspectRatio}) · 우클릭하여 이미지 복사 가능
              </div>
            </div>
          )}

          {/* Meta Summary & Tags */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-slate-600">스니펫 요약:</span>
              <p className="text-xs text-slate-700 mt-0.5">{generatedPost.summary}</p>
            </div>

            {generatedPost.tags && generatedPost.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600 mr-1">추천 태그:</span>
                {generatedPost.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs font-medium bg-white text-indigo-700 border border-slate-200 rounded-md"
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
                dangerouslySetInnerHTML={{ __html: generatedPost.contentHtml }}
              />
            )}

            {/* Tab 2: Markdown Preview */}
            {resultTab === "markdown" && (
              <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                {generatedPost.markdown}
              </pre>
            )}

            {/* Tab 3: Plain Text Preview */}
            {resultTab === "text" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                {generatedPost.plainText}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            생성된 콘텐츠가 여기에 표시됩니다.
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            위에서 주제를 입력하거나 추천받은 주제를 선택한 후, 테마와 옵션을 설정하고 [블로그 포스트 생성하기] 버튼을 클릭하세요.
          </p>
        </div>
      )}
    </div>
  );
}
