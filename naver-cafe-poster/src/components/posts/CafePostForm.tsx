"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createPostAction, type PostActionState } from "@/lib/actions/posts";
import { generateCafePostAction } from "@/lib/actions/ai";
import type { CafeTarget } from "@/types/post";

const initialState: PostActionState = {};

export function CafePostForm({
  targets,
  hasNaverAccount,
  initialTitle = "",
  initialContent = "",
}: {
  targets: CafeTarget[];
  hasNaverAccount: boolean;
  initialTitle?: string;
  initialContent?: string;
}) {
  const [state, formAction, isPending] = useActionState(createPostAction, initialState);
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

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
    <form action={formAction} className="space-y-4">
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
        <label className="mb-1 block text-xs font-medium text-neutral-500">등록할 카페</label>
        <select
          name="targetId"
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">카페를 선택하세요</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.label}
            </option>
          ))}
        </select>
        {targets.length === 0 && (
          <p className="mt-1 text-xs text-red-600">
            등록된 카페가 없습니다. 설정 페이지에서 먼저 카페 게시판을 등록해주세요.
          </p>
        )}
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
          rows={12}
          required
        />
      </div>

      <Button type="submit" disabled={isPending || !hasNaverAccount || targets.length === 0}>
        {isPending ? "게시 중..." : "이 내용으로 게시하기"}
      </Button>
      {!hasNaverAccount && (
        <p className="text-xs text-red-600">네이버 계정이 연결되어 있지 않아 게시할 수 없습니다.</p>
      )}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
