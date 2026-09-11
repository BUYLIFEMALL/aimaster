"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { saveDraftAction, type PostActionState } from "@/lib/actions/posts";
import { generateCafePostAction } from "@/lib/actions/ai";
import { CAFE_TONE_OPTIONS, type CafeTone } from "@/lib/ai/tone";
import type { CafeTarget } from "@/types/post";

const initialState: PostActionState = {};

const SUGGESTED_TOPICS = [
  "겨울철 실내 습도 관리 팁",
  "요즘 카페 회원들이 많이 묻는 질문 모음",
  "이번 달 주요 공지 정리",
  "회원들이 남긴 후기 하이라이트",
  "초보자를 위한 시작 가이드",
];

export function DraftComposer({
  targets,
  initialTitle = "",
  initialContent = "",
}: {
  targets: CafeTarget[];
  initialTitle?: string;
  initialContent?: string;
}) {
  const [state, formAction, isPending] = useActionState(saveDraftAction, initialState);

  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [targetId, setTargetId] = useState("");

  const [showOptions, setShowOptions] = useState(false);
  const [tone, setTone] = useState<CafeTone>("친근함");
  const [targetAudience, setTargetAudience] = useState("");
  const [wordCount, setWordCount] = useState(600);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>(["", "", ""]);
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  const [aiError, setAiError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  // 후보(candidates)에서 "이 후보로 글쓰기"로 넘어오면 title/content가 바뀐다 — 그때마다 반영.
  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
  }, [initialTitle, initialContent]);

  // 저장 성공 시 다음 초안을 바로 이어서 쓸 수 있게 입력값을 비운다.
  useEffect(() => {
    if (state.success) {
      setTopic("");
      setTitle("");
      setContent("");
      setTargetId("");
      setKeywords([]);
      setKeywordInput("");
      setReferenceUrls(["", "", ""]);
      setCtaText("");
      setCtaUrl("");
      setCustomInstructions("");
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

  const handleGenerate = () => {
    if (!topic.trim()) {
      setAiError("글감(주제)을 입력해주세요.");
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
      setTitle(result.title ?? "");
      setContent(result.content ?? "");
    });
  };

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="space-y-3 rounded-lg border border-dashed border-neutral-300 p-3">
        <p className="text-xs font-medium text-neutral-700">🤖 AI로 글감 만들기</p>

        <Textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
          placeholder="주제를 입력하세요 (예: 겨울철 실내 습도 관리 팁)"
        />

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] text-neutral-600 hover:bg-neutral-100"
            >
              {t}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
        >
          {showOptions ? "▲ 세부 옵션 접기" : "▼ 세부 옵션 펼치기 (분위기·독자·분량·키워드·참고링크)"}
        </button>

        {showOptions && (
          <div className="space-y-3 border-t border-neutral-200 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">글 분위기</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as CafeTone)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  {CAFE_TONE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">대상 독자 (선택)</label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="예: 신규 회원"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>목표 분량</span>
                <span className="text-neutral-700">{wordCount.toLocaleString()} 단어</span>
              </div>
              <input
                type="range"
                min={300}
                max={1500}
                step={100}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-neutral-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">검색 키워드 (선택)</label>
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="키워드 입력 후 Enter"
              />
              {keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700"
                    >
                      #{kw}
                      <button
                        type="button"
                        onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
                        className="text-neutral-400 hover:text-neutral-800"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">참고 웹페이지 링크 (선택, 최대 3개)</label>
              <div className="space-y-2">
                {referenceUrls.map((url, idx) => (
                  <Input
                    key={idx}
                    value={url}
                    onChange={(e) => handleUrlChange(idx, e.target.value)}
                    placeholder={`https://example.com/reference-${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">추천 링크 문구 (선택)</label>
                <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="예: 자세히 보기" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">추천 링크 URL (선택)</label>
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://example.com" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">추가 지시사항 (선택)</label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
                placeholder="꼭 다뤄야 할 내용, 피해야 할 내용 등"
              />
            </div>
          </div>
        )}

        <Button type="button" variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? "생성 중..." : "✨ AI 생성"}
        </Button>
        {aiError && <p className="text-xs text-red-600">{aiError}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">제목</label>
        <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">본문</label>
        <Textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">등록할 카페 (나중에 골라도 됩니다)</label>
        <select
          name="targetId"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">아직 안 정함</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "초안으로 저장"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-green-600">초안이 저장되었습니다. 아래 목록에서 검수 후 배포하세요.</p>}
    </form>
  );
}
