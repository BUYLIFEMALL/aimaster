"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { saveDraftAction, type PostActionState } from "@/lib/actions/posts";
import {
  generateCafePostAction,
  reviseCafePostAction,
  generateCafeImageAction,
  generateCafeImagePromptAction,
} from "@/lib/actions/ai";
import { CAFE_TONE_OPTIONS, type CafeTone } from "@/lib/ai/tone";
import type { CafeTarget } from "@/types/post";

const initialState: PostActionState = {};

const IMAGE_MODEL_OPTIONS = [
  { label: "NanoBanana 2-2K (2K 고화질 비주얼 - 추천)", value: "nanobanana-2-2k" },
  { label: "NanoBanana 2-4K (4K 울트라 HD)", value: "nanobanana-2-4k" },
  { label: "NanoBanana Pro (프로페셔널 인포그래픽)", value: "nanobanana-pro" },
  { label: "NanoBanana Standard (기본 모델)", value: "nanobanana" },
] as const;

/**
 * "AI 맞춤 자동 글쓰기"(주제 기반 새 글 생성)는 별도 메뉴 "AI 글쓰기"(/write)로 분리했다
 * (2026-09-13 사용자 요청). 이 컴포넌트("AI 자동 초안생성")는 글감 수집/후보 등에서 넘어온
 * 원본 제목·본문을 "그대로" 저장하지 않는다 — "AI 초안생성" 버튼을 누르면 제목을 주제로,
 * 기존 본문을 참고 자료로 삼아 세부 옵션(분위기·대상독자·분량·키워드·참고URL·추가지시사항·
 * CTA)을 반영해 AI가 완성도 있는 본문을 새로 쓰고, 그 내용으로 대표 이미지까지 자동 생성한
 * 뒤 바로 초안으로 저장한다(단순 저장이 아니라 "생성 후 저장"이라는 지적을 반영, 2026-09-13).
 * "AI에게 수정 요청하기"는 그렇게 만들어진 결과를 부분적으로 다듬고 싶을 때 쓰는 별도 기능이다.
 */
export function DraftComposer({
  targets,
  initialTitle = "",
  initialContent = "",
  initialImageUrl = "",
  initialTargetId = "",
}: {
  targets: CafeTarget[];
  initialTitle?: string;
  initialContent?: string;
  initialImageUrl?: string;
  initialTargetId?: string;
}) {
  const [state, formAction, isPending] = useActionState(saveDraftAction, initialState);

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);

  const [tone, setTone] = useState<CafeTone>("전문적");
  const [targetAudience, setTargetAudience] = useState("");
  const [wordCount, setWordCount] = useState(1000);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>(["", "", ""]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const [imageModel, setImageModel] = useState("nanobanana-2-2k");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageEndpoint, setImageEndpoint] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isGeneratingImage, startGeneratingImage] = useTransition();

  const [reviseInstruction, setReviseInstruction] = useState("");
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [isRevising, startRevising] = useTransition();

  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGeneratingDraft, startGeneratingDraft] = useTransition();

  // 후보(candidates)나 "AI 글쓰기"(/write)에서 결과를 들고 넘어오면 값이 바뀐다 — 그때마다 반영.
  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
  }, [initialTitle, initialContent]);

  useEffect(() => {
    setImageUrl(initialImageUrl);
    setTargetId(initialTargetId);
  }, [initialImageUrl, initialTargetId]);

  // 저장 성공 시 다음 초안을 바로 이어서 쓸 수 있게 입력값을 비운다.
  useEffect(() => {
    if (state.success) {
      setTitle("");
      setContent("");
      setTargetId("");
      setImageUrl("");
      setKeywords([]);
      setKeywordInput("");
      setReferenceUrls(["", "", ""]);
      setCustomInstructions("");
      setCtaText("");
      setCtaUrl("");
      setImagePrompt("");
    }
  }, [state.success]);

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

  const handleRevise = () => {
    if (!title.trim() || !content.trim()) {
      setReviseError("먼저 제목/본문을 입력해주세요.");
      return;
    }
    if (!reviseInstruction.trim()) {
      setReviseError("어떻게 고칠지 지시사항을 입력해주세요.");
      return;
    }
    setReviseError(null);
    startRevising(async () => {
      const result = await reviseCafePostAction({
        title,
        content,
        instruction: reviseInstruction,
        tone,
        targetAudience: targetAudience.trim() || undefined,
        wordCount,
        keywords,
        referenceUrls: referenceUrls.map((u) => u.trim()).filter(Boolean),
        customInstructions: customInstructions.trim() || undefined,
        cta: ctaText.trim() || ctaUrl.trim() ? { text: ctaText.trim() || "자세히 보기", url: ctaUrl.trim() || "#" } : undefined,
      });
      if (result.error) {
        setReviseError(result.error);
        return;
      }
      setTitle(result.title ?? title);
      setContent(result.content ?? content);
      setReviseInstruction("");
    });
  };

  /** 나노바나나(Gemini)가 같은 프롬프트에도 가끔 이미지 없이 응답하는 비결정적 특성이 있어서
   * 최대 2회까지 자동 재시도한다(threads-affiliate-poster/AIWriteForm과 동일한 패턴). 생성된
   * URL을 반환해서 handleGenerateAndSave에서 저장 직전에 바로 쓸 수 있게 한다. */
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

  const handleGenerateImage = () => {
    setImageError(null);
    startGeneratingImage(async () => {
      // 프롬프트를 직접 안 적었으면, 지금 제목/본문 내용을 분석해 이미지 프롬프트를 만든다.
      let prompt = imagePrompt.trim();
      if (!prompt) {
        const promptResult = await generateCafeImagePromptAction({ title, content });
        if (promptResult.error && !promptResult.prompt) {
          setImageError(promptResult.error);
          return;
        }
        prompt = promptResult.prompt || title;
        if (promptResult.prompt) setImagePrompt(promptResult.prompt);
      }
      await runImageGeneration(prompt);
    });
  };

  /** "AI 초안생성" 버튼의 실제 동작 — 예전엔 그냥 저장만 했는데, "위에 가져온 글을 그대로
   * 쓰지 말고 제대로 된 콘텐츠와 이미지까지 같이 만들어야 한다"는 지적(2026-09-13)에 따라
   * 고쳤다: 제목을 주제로, 기존 본문(글감 수집 등에서 넘어온 원본)을 참고 자료로 삼아
   * 세부 옵션(분위기/대상독자/분량/키워드/참고URL/추가지시사항)을 반영해 AI가 본문을 새로
   * 작성하고, 그 내용으로 대표 이미지까지 자동 생성한 뒤 초안으로 저장한다. */
  const handleGenerateAndSave = () => {
    if (!title.trim()) {
      setGenerateError("제목을 입력해주세요 — AI가 이 제목을 주제로 삼아 본문을 새로 작성합니다.");
      return;
    }
    setGenerateError(null);
    startGeneratingDraft(async () => {
      const result = await generateCafePostAction({
        topic: title,
        referenceContent: content.trim() || undefined,
        tone,
        targetAudience: targetAudience.trim() || undefined,
        wordCount,
        keywords,
        referenceUrls: referenceUrls.map((u) => u.trim()).filter(Boolean),
        customInstructions: customInstructions.trim() || undefined,
        cta: ctaText.trim() || ctaUrl.trim() ? { text: ctaText.trim() || "자세히 보기", url: ctaUrl.trim() || "#" } : undefined,
      });
      if (result.error) {
        setGenerateError(result.error);
        return;
      }
      const newTitle = result.title ?? title;
      const newContent = result.content ?? content;
      setTitle(newTitle);
      setContent(newContent);

      let generatedImageUrl = imageUrl;
      if (newContent.trim()) {
        setImageError(null);
        const promptResult = await generateCafeImagePromptAction({ title: newTitle, content: newContent });
        if (promptResult.prompt) setImagePrompt(promptResult.prompt);
        const prompt = promptResult.prompt || newTitle;
        generatedImageUrl = await runImageGeneration(prompt);
      }

      const formData = new FormData();
      formData.set("title", newTitle);
      formData.set("content", newContent);
      formData.set("targetId", targetId);
      formData.set("imageUrl", generatedImageUrl);
      formAction(formData);
    });
  };

  return (
    // "AI 초안생성" 버튼이 AI 생성(비동기) 후 formAction을 직접 호출하는 방식으로 바뀌면서
    // 네이티브 <form> 제출에 더 이상 의존하지 않는다 — <form>으로 두면 입력창에서 Enter를 눌렀을 때
    // 이름 없는 필드들로 빈 네이티브 제출이 실수로 발생할 수 있어 <div>로 바꿨다.
    <div className="space-y-4 rounded-2xl border-2 border-neutral-300 bg-neutral-50/50 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900">📝 초안 확인 및 저장</h2>
        <p className="text-xs text-neutral-500">
          글감 수집이나 AI 글쓰기에서 넘어온 제목/본문(또는 직접 입력한 내용)을 참고 자료로,
          아래 세부 옵션을 반영해 "AI 초안생성"을 누르면 AI가 완성도 있는 본문과 대표 이미지를
          새로 만들어 바로 초안으로 저장합니다.
        </p>
      </div>

      {/* 카페 선택 — 예전엔 "AI 맞춤 자동 글쓰기" 섹션에만 있었는데, 그 섹션이 별도 메뉴로
          빠지면서 여기로 옮겨왔다. 저장할 때 어느 카페에 등록할지는 이 화면에서 정한다. */}
      <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4">
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

      {/* 세부 옵션 설정 — "AI 글쓰기"와 동일한 항목이지만 주제(필수) 입력은 없다(이미 아래
          제목/본문이 있으므로). "AI에게 수정 요청하기"를 누를 때 이 설정들이 함께 반영된다. */}
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
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

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-neutral-700">제목</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        <p className="text-[11px] text-neutral-500">
          "AI 초안생성"을 누르면 이 제목을 주제로 삼아 AI가 본문을 새로 작성합니다.
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-neutral-700">본문 (참고 자료)</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          autoGrow
        />
        <p className="text-[11px] text-neutral-500">
          여기 있는 내용(글감 수집 등에서 넘어온 원본)은 AI가 참고할 자료입니다. "AI 초안생성"을
          누르면 이 내용을 바탕으로 세부 옵션을 반영해 완성도 있는 본문으로 새로 작성됩니다.
          {ctaText.trim() && ctaUrl.trim() && " 추천 링크도 끝에 자동으로 붙습니다."}
        </p>
      </div>

      {/* AI 이미지 생성 설정 — "AI 글쓰기"와 동일하게 실제 생성/재생성이 가능하다(예전엔
          미리보기+제거만 가능했는데, "같은 기능을 구현해달라"는 요청으로 전체 컨트롤을 옮겨왔다). */}
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
          placeholder="이미지 프롬프트 (비워두면 지금 위 제목/본문 내용을 분석해서 자동 생성)"
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
          {isGeneratingImage ? "이미지 생성 중..." : imageUrl ? "🖼️ 이미지 다시 생성" : "🖼️ 대표 이미지 생성"}
        </Button>
        {imageError && <p className="text-xs text-red-600">{imageError}</p>}
        {imageUrl && (
          <div className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="대표 이미지"
              className="h-auto w-full max-h-96 rounded-lg border border-neutral-200 object-cover"
            />
            <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-600 hover:underline">
              이미지 제거
            </button>
          </div>
        )}
      </div>

      {/* 하단 추천/홍보 링크(CTA) — "AI 글쓰기"와 동일한 항목. "AI 초안생성" 클릭 시 AI가
          생성한 본문 끝에 서버(cafeGenerator.ts appendCtaIfNeeded)에서 자동으로 붙여준다. */}
      <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
          🔗 하단 추천/홍보 링크 지정 (CTA - 행동 유도 버튼)
        </label>
        <p className="text-xs text-indigo-700">저장 시 본문과 어우러지는 추천 링크가 끝에 삽입됩니다.</p>
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

      <div className="space-y-2 rounded-lg border border-dashed border-neutral-300 bg-white p-3">
        <p className="text-xs font-medium text-neutral-700">✏️ AI에게 수정 요청하기</p>
        <p className="text-[11px] text-neutral-500">
          처음부터 다시 만들지 않고, 위 제목/본문에서 원하는 부분만 고쳐달라고 요청할 수 있습니다.
          위 세부 옵션·CTA 설정이 함께 반영됩니다.
        </p>
        <div className="flex gap-2">
          <Input
            value={reviseInstruction}
            onChange={(e) => setReviseInstruction(e.target.value)}
            placeholder="예: 결론 부분을 더 강조해줘 / 좀 더 짧게 줄여줘"
          />
          <Button type="button" variant="secondary" onClick={handleRevise} disabled={isRevising}>
            {isRevising ? "수정 중..." : "수정 요청"}
          </Button>
        </div>
        {reviseError && <p className="text-xs text-red-600">{reviseError}</p>}
      </div>

      <Button
        type="button"
        onClick={handleGenerateAndSave}
        disabled={isGeneratingDraft || isPending}
        className="w-full"
      >
        {isGeneratingDraft ? "AI 생성 중..." : isPending ? "저장 중..." : "AI 초안생성"}
      </Button>
      {generateError && <p className="text-xs text-red-600">{generateError}</p>}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-xs text-green-600">초안이 저장되었습니다. 아래 목록에서 검수 후 게시하세요.</p>
      )}
    </div>
  );
}
