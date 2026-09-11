"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { saveDraftAction, type PostActionState } from "@/lib/actions/posts";
import { generateCafePostAction } from "@/lib/actions/ai";
import type { CafeTarget } from "@/types/post";

const initialState: PostActionState = {};

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
    }
  }, [state.success]);

  const handleGenerate = () => {
    if (!topic.trim()) {
      setAiError("글감(주제)을 입력해주세요.");
      return;
    }
    setAiError(null);
    startGenerating(async () => {
      const result = await generateCafePostAction({ topic });
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
      <div className="space-y-2 rounded-lg border border-dashed border-neutral-300 p-3">
        <p className="text-xs font-medium text-neutral-700">🤖 AI로 글감 만들기</p>
        <div className="flex gap-2">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="글감(주제)을 입력하세요 (예: 겨울철 실내 습도 관리 팁)"
          />
          <Button type="button" variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "생성 중..." : "AI 생성"}
          </Button>
        </div>
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
