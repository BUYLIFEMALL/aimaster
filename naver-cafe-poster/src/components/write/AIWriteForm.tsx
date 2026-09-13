"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  generateCafePostAction,
  generateCafeImageAction,
  generateCafeImagePromptAction,
} from "@/lib/actions/ai";
import { CAFE_TONE_OPTIONS, type CafeTone } from "@/lib/ai/tone";
import type { CafeTarget } from "@/types/post";

const SUGGESTED_TOPICS = [
  "겨울철 실내 습도 관리 팁",
  "요즘 카페 회원들이 많이 묻는 질문 모음",
  "이번 달 주요 공지 정리",
  "회원들이 남긴 후기 하이라이트",
  "초보자를 위한 시작 가이드",
];

const IMAGE_MODEL_OPTIONS = [
  { label: "NanoBanana 2-2K (2K 고화질 비주얼 - 추천)", value: "nanobanana-2-2k" },
  { label: "NanoBanana 2-4K (4K 울트라 HD)", value: "nanobanana-2-4k" },
  { label: "NanoBanana Pro (프로페셔널 인포그래픽)", value: "nanobanana-pro" },
  { label: "NanoBanana Standard (기본 모델)", value: "nanobanana" },
] as const;

/**
 * "AI 맞춤 자동 글쓰기"(주제 기반 AI 생성) 기능을 별도 메뉴로 분리했다(2026-09-13 사용자 요청)
 * — 예전엔 /drafts 페이지 안에 "초안 확인 및 저장"과 함께 있었는데, 새 글을 AI로 "만드는" 것과
 * 만들어진 초안을 "검토·저장·게시 준비"하는 것은 서로 다른 작업이라 화면을 나눴다. 여기서
 * 생성이 끝나면 결과(제목/본문/이미지/선택한 카페)를 들고 /drafts?title=...&content=...로
 * 넘어가 그 화면에서 검토·수정 후 저장하게 한다 — "글감 수집"에서 "이 후보로 AI 글쓰기"를
 * 눌렀을 때와 동일한 흐름이다.
 */
export function AIWriteForm({ targets }: { targets: CafeTarget[] }) {
  const router = useRouter();

  const [targetId, setTargetId] = useState("");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<CafeTone>("전문적");
  const [targetAudience, setTargetAudience] = useState("");
  const [wordCount, setWordCount] = useState(1000);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>(["", "", ""]);
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  const [imageModel, setImageModel] = useState("nanobanana-2-2k");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageEndpoint, setImageEndpoint] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isGeneratingImage, startGeneratingImage] = useTransition();

  const [aiError, setAiError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  const handleAddKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput("");
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword(keywordInput);
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    setReferenceUrls((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  /** 나노바나나(Gemini)가 같은 프롬프트에도 가끔 이미지 없이 응답하는 비결정적 특성이 있어서
   * 최대 2회까지 자동 재시도한다. 성공한 이미지 URL을 반환해 handleGenerate에서 /drafts로
   * 넘어갈 때 바로 쓸 수 있게 한다. */
  const runImageGeneration = async (prompt: string): Promise<string> => {
    const MAX_IMAGE_ATTEMPTS = 2;
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt += 1) {
      const result = await generateCafeImageAction({
        prompt,
        apiKey: imageApiKey.trim() || undefined,
        model: imageModel as never,
        endpoint: imageEndpoint.trim() || undefined,
      });
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
        return result.imageUrl;
      }
      lastError = result.error;
    }
    if (lastError) setImageError(lastError);
    return "";
  };

  const handleGenerate = () => {
    if (!topic.trim()) {
      setAiError("주제를 입력해주세요.");
      return;
    }
    setAiError(null);
    startGenerating(async () => {
      const result = await generateCafePostAction({
        topic,
        tone,
        targetAudience: targetAudience.trim() || undefined,
        wordCount,
        keywords,
        referenceUrls: referenceUrls.map((u) => u.trim()).filter(Boolean),
        customInstructions: customInstructions.trim() || undefined,
        cta: ctaText.trim() || ctaUrl.trim() ? { text: ctaText.trim() || "자세히 보기", url: ctaUrl.trim() || "#" } : undefined,
      });
      if (result.error) {
        setAiError(result.error);
        return;
      }
      const newTitle = result.title ?? "";
      const newContent = result.content ?? "";

      // 본문이 만들어지면 그 내용을 분석해 대표 이미지도 이어서 자동 생성한다 — 이미지까지
      // 다 만들어진 뒤에 /drafts로 넘어가야 새 화면에 이미지도 함께 프리필된다.
      let generatedImageUrl = "";
      if (newContent.trim()) {
        setImageError(null);
        const promptResult = await generateCafeImagePromptAction({ title: newTitle, content: newContent });
        if (promptResult.prompt) setImagePrompt(promptResult.prompt);
        const prompt = promptResult.prompt || newTitle;
        generatedImageUrl = await runImageGeneration(prompt);
      }

      const params = new URLSearchParams({ title: newTitle, content: newContent });
      if (generatedImageUrl) params.set("imageUrl", generatedImageUrl);
      if (targetId) params.set("targetId", targetId);
      router.push(`/drafts?${params.toString()}`);
    });
  };

  const handleGenerateImage = () => {
    const prompt = imagePrompt.trim() || topic.trim();
    if (!prompt) {
      setImageError("이미지 프롬프트(또는 주제)를 입력해주세요.");
      return;
    }
    setImageError(null);
    startGeneratingImage(async () => {
      await runImageGeneration(prompt);
    });
  };

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="space-y-1 border-b border-neutral-100 pb-4">
        <h2 className="text-lg font-bold text-neutral-900">AI 맞춤 자동 글쓰기</h2>
        <p className="text-xs text-neutral-500">
          카페, 주제, AI 이미지 설정 및 추천링크를 지정하시면 카페 게시글이 자동 생성됩니다.
          생성이 끝나면 "AI 자동 글쓰기(초안)" 화면으로 이동해 검토·저장할 수 있습니다.
        </p>
      </div>

      {/* 1. 카페 선택 (blog의 "포스팅 카테고리 선택"에 대응 — 카페 자동화는 여러 카테고리가
          아니라 "어느 카페에 올릴지"가 그 역할을 한다) */}
      <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
            📁 등록할 카페 선택
          </label>
          <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
            {targetId ? "1개 선택됨" : "나중에 선택 가능"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {targets.map((target) => {
            const isSelected = targetId === target.id;
            return (
              <button
                key={target.id}
                type="button"
                onClick={() => setTargetId(isSelected ? "" : target.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "scale-105 bg-blue-600 text-white shadow-md shadow-blue-500/30"
                    : "border border-neutral-200 bg-white text-neutral-700 hover:bg-blue-50"
                }`}
              >
                {isSelected && "✓ "}
                {target.label}
              </button>
            );
          })}
          {targets.length === 0 && (
            <p className="text-xs text-neutral-500">
              등록된 카페가 없습니다 — 설정 페이지에서 먼저 등록해주세요.
            </p>
          )}
        </div>
      </div>

      {/* 2. 주제 + 추천 예시 주제 */}
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">✏️ 주제 (필수)</label>
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="주제를 입력하세요 (예: 겨울철 실내 습도 관리 팁)"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-500">💡 추천 예시 주제</label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className="rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 세부 옵션 설정 — 항상 펼쳐져 있음 */}
      <div className="space-y-4 border-t border-neutral-100 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-neutral-800">⚙️ 세부 옵션 설정</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">글 분위기 (Tone)</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as CafeTone)}
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm font-semibold"
            >
              {CAFE_TONE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">대상 독자</label>
            <Input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="어떤 독자를 위한 글인지 입력하세요 (선택)"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
            <span>원하는 분량 (단어 수)</span>
            <span className="text-indigo-600">{wordCount.toLocaleString()} 단어</span>
          </div>
          <input
            type="range"
            min={500}
            max={2000}
            step={250}
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] font-medium text-neutral-400">
            <span>500 (간결함)</span>
            <span>1,000 (표준)</span>
            <span>2,000 (상세 가이드)</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">검색 키워드 (SEO Keywords)</label>
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder="키워드 입력 후 Enter (선택)"
          />
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"
                >
                  #{kw}
                  <button
                    type="button"
                    onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
                    className="font-bold text-indigo-400 hover:text-indigo-800"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
            <span>참고 웹페이지 링크 (Reference URLs)</span>
            <span className="font-normal text-neutral-400">최대 3개</span>
          </div>
          <div className="space-y-2">
            {referenceUrls.map((url, idx) => (
              <Input
                key={idx}
                name={`ref_no_autofill_${idx + 1}`}
                autoComplete="new-password"
                value={url}
                onChange={(e) => handleUrlChange(idx, e.target.value)}
                placeholder={`https://example.com/reference-${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">추가 지시사항 (Custom Prompt)</label>
          <Textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={2}
            placeholder="꼭 다뤄야 할 내용, 피해야 할 내용, 특정 브랜드/서비스 언급 등 (선택)"
          />
        </div>
      </div>

      {/* 4. AI 이미지 생성 설정 — 항상 펼쳐져 있음 */}
      <div className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
          🖼️ AI 이미지 생성 설정 (NANOBANANA AI)
        </label>
        <p className="text-xs font-medium text-amber-800">
          대표 이미지를 생성해 초안에 첨부합니다. 네이버 카페 API가 이미지를 실제로 렌더링해주는지는
          아직 미확인이라, 배포 시 게시글 맨 위에 이미지 링크로 붙습니다.
        </p>

        <Textarea
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          rows={2}
          autoGrow
          placeholder="이미지 프롬프트 (비워두면 주제를 그대로 사용)"
        />

        <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">이미지 모델 (Image Model)</label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm font-semibold"
            >
              {IMAGE_MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">나노바나나 API 키 (API Key)</label>
            <Input
              type="text"
              name="nb_api_key_field"
              value={imageApiKey}
              onChange={(e) => setImageApiKey(e.target.value)}
              placeholder="비워두면 설정에 등록된 내 키 사용"
              autoComplete="new-password"
              style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">커스텀 API 엔드포인트 (선택)</label>
          <Input
            value={imageEndpoint}
            onChange={(e) => setImageEndpoint(e.target.value)}
            placeholder="https://generativelanguage.googleapis.com/v1beta/models/..."
          />
        </div>

        <Button type="button" variant="secondary" onClick={handleGenerateImage} disabled={isGeneratingImage}>
          {isGeneratingImage ? "이미지 생성 중..." : "🖼️ 대표 이미지 생성"}
        </Button>
        {imageError && <p className="text-xs text-red-600">{imageError}</p>}
        {imageUrl && (
          <div className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="생성된 대표 이미지"
              className="h-auto w-full max-h-96 rounded-lg border border-neutral-200 object-cover"
            />
            <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-600 hover:underline">
              이미지 제거
            </button>
          </div>
        )}
      </div>

      {/* 5. 하단 추천/홍보 링크(CTA) — 항상 펼쳐져 있음 */}
      <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
          🔗 하단 추천/홍보 링크 지정 (CTA - 행동 유도 버튼)
        </label>
        <p className="text-xs text-indigo-700">글 하단에 본문과 어우러지는 추천 링크가 삽입됩니다.</p>
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">추천 버튼 문구</label>
            <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="예: 자세히 보기" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">추천 대상 URL</label>
            <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://example.com/offer" />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button type="button" onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 text-base">
          {isGenerating ? "AI 글 생성 중..." : "✨ AI 글 생성 시작"}
        </Button>
        {aiError && <p className="mt-2 text-xs text-red-600">{aiError}</p>}
      </div>
    </div>
  );
}
