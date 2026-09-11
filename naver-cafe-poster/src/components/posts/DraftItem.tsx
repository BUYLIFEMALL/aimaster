"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { updateDraftAction, deployDraftAction, deletePostAction, type PostActionState } from "@/lib/actions/posts";
import { reviseCafePostAction } from "@/lib/actions/ai";
import type { CafePost, CafeTarget, PostStatus } from "@/types/post";

const initialState: PostActionState = {};

export function DraftItem({
  post,
  targets,
  hasNaverAccount,
  startInEdit = false,
}: {
  post: CafePost;
  targets: CafeTarget[];
  hasNaverAccount: boolean;
  startInEdit?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(startInEdit);
  const [state, formAction, isPending] = useActionState(updateDraftAction, initialState);
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [targetId, setTargetId] = useState(post.target_id ?? "");
  const [imageUrl, setImageUrl] = useState(post.image_url ?? "");
  const [reviseInstruction, setReviseInstruction] = useState("");
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [isRevising, startRevising] = useTransition();

  const status = post.status as PostStatus;
  const targetLabel = targets.find((t) => t.id === post.target_id)?.label ?? null;

  useEffect(() => {
    if (state.success) setIsEditing(false);
  }, [state.success]);

  const handleRevise = () => {
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

  if (isEditing) {
    return (
      <li className="space-y-3 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="postId" value={post.id} />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} name="title" required />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} name="content" rows={8} required />

          <div className="space-y-2 rounded-lg border border-dashed border-neutral-300 bg-white p-3">
            <p className="text-xs font-medium text-neutral-700">✏️ AI에게 수정 요청하기</p>
            <div className="flex gap-2">
              <Input
                value={reviseInstruction}
                onChange={(e) => setReviseInstruction(e.target.value)}
                placeholder="예: 결론 부분을 더 강조해줘"
              />
              <Button type="button" variant="secondary" onClick={handleRevise} disabled={isRevising}>
                {isRevising ? "수정 중..." : "수정 요청"}
              </Button>
            </div>
            {reviseError && <p className="text-xs text-red-600">{reviseError}</p>}
          </div>

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
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">대표 이미지 URL (선택)</label>
            <Input
              name="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="대표 이미지" className="mt-2 max-h-40 rounded-lg border border-neutral-200" />
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
              취소
            </Button>
          </div>
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{post.title}</p>
          <p className="mt-1 text-xs text-neutral-500">{targetLabel ?? "카페 미지정"}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image_url} alt="대표 이미지" className="mb-2 max-h-32 rounded-lg border border-neutral-200" />
      )}
      <p className="whitespace-pre-wrap text-sm text-neutral-700 line-clamp-4">{post.content}</p>
      {status === "failed" && post.error_message && (
        <p className="mt-2 text-xs text-red-600">실패 사유: {post.error_message}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
        <Button type="button" variant="secondary" onClick={() => setIsEditing(true)}>
          수정
        </Button>
        <form action={deployDraftAction}>
          <input type="hidden" name="postId" value={post.id} />
          <Button type="submit" disabled={!hasNaverAccount || !post.target_id}>
            검수 완료 · 배포
          </Button>
        </form>
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="redirectTo" value="/drafts" />
          <DeleteButton />
        </form>
        <Link href={`/posts/${post.id}`} className="ml-auto text-xs text-neutral-500 hover:underline">
          상세 보기
        </Link>
      </div>
      {!hasNaverAccount && (
        <p className="mt-2 text-xs text-red-600">네이버 계정이 연결되어 있지 않아 배포할 수 없습니다.</p>
      )}
      {hasNaverAccount && !post.target_id && (
        <p className="mt-2 text-xs text-amber-600">등록할 카페를 아직 안 골랐습니다 — 수정에서 지정해주세요.</p>
      )}
    </li>
  );
}
