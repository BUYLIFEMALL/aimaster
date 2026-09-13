"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { saveDraftAction, type PostActionState } from "@/lib/actions/posts";
import { reviseCafePostAction } from "@/lib/actions/ai";
import type { CafeTarget } from "@/types/post";

const initialState: PostActionState = {};

/**
 * "AI 맞춤 자동 글쓰기"(주제 기반 새 글 생성)는 별도 메뉴 "AI 글쓰기"(/write)로 분리했다
 * (2026-09-13 사용자 요청) — 이 컴포넌트는 이제 "이미 있는 제목/본문(글감 수집 후보, /write의
 * AI 생성 결과, 또는 직접 입력)을 검토·수정하고 초안으로 저장"하는 역할만 담당한다. 카페 선택은
 * 예전엔 AI 생성 섹션에만 있었는데, 그 섹션이 빠지면서 여기로 옮겨왔다 — 저장 시 어느 카페에
 * 등록할지는 어차피 이 화면에서 결정해야 하기 때문이다.
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

  const [reviseInstruction, setReviseInstruction] = useState("");
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [isRevising, startRevising] = useTransition();

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
    }
  }, [state.success]);

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
      const result = await reviseCafePostAction({ title, content, instruction: reviseInstruction });
      if (result.error) {
        setReviseError(result.error);
        return;
      }
      setTitle(result.title ?? title);
      setContent(result.content ?? content);
      setReviseInstruction("");
    });
  };

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border-2 border-neutral-300 bg-neutral-50/50 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900">📝 초안 확인 및 저장</h2>
        <p className="text-xs text-neutral-500">
          이미 준비된 제목/본문이 있다면(글감 수집이나 AI 글쓰기에서 넘어온 경우 등) 여기서
          검토·수정하고 저장하세요. 새로 AI에게 글을 써달라고 하려면 "AI 글쓰기" 메뉴를 이용하세요.
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
        <input type="hidden" name="targetId" value={targetId} />
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

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-neutral-700">제목</label>
        <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-neutral-700">본문</label>
        <Textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          autoGrow
          required
        />
      </div>

      {/* 이미지 — "AI 글쓰기"에서 생성된 이미지가 있으면 미리보기로 넘어온다. 실제 생성/재생성은
          "AI 글쓰기" 메뉴에서 하고, 여기서는 확인 후 필요하면 제거만 할 수 있다. */}
      {imageUrl && (
        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-700">대표 이미지</label>
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
      <input type="hidden" name="imageUrl" value={imageUrl} />

      <div className="space-y-2 rounded-lg border border-dashed border-neutral-300 bg-white p-3">
        <p className="text-xs font-medium text-neutral-700">✏️ AI에게 수정 요청하기</p>
        <p className="text-[11px] text-neutral-500">
          처음부터 다시 만들지 않고, 위 제목/본문에서 원하는 부분만 고쳐달라고 요청할 수 있습니다.
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

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "저장 중..." : "AI 초안생성"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-xs text-green-600">초안이 저장되었습니다. 아래 목록에서 검수 후 게시하세요.</p>
      )}
    </form>
  );
}
