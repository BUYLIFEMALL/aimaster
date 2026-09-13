"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { updateAndRepublishPostAction, type PostActionState } from "@/lib/actions/posts";
import type { CafePost, CafeTarget, PostStatus } from "@/types/post";

const initialState: PostActionState = {};

export function PostEditForm({ post, targets }: { post: CafePost; targets: CafeTarget[] }) {
  const [state, formAction, isPending] = useActionState(updateAndRepublishPostAction, initialState);
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [targetId, setTargetId] = useState(post.target_id ?? "");
  const [imageUrl, setImageUrl] = useState(post.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(post.video_url ?? "");

  const status = post.status as PostStatus;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="postId" value={post.id} />

      {status === "published" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          이미 카페에 게시된 글입니다. 네이버 오픈API에는 수정 기능이 없어, 아래에서 저장하면
          카페에 <b>새 글로 다시 게시</b>됩니다 — 기존에 올라간 글은 그대로 남아있으니 필요하면
          카페에서 직접 삭제/수정해주세요.
        </div>
      )}

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
          rows={12}
          autoGrow
          required
        />
      </div>

      <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">📁 등록할 카페 선택</p>
          <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
            {targetId ? "1개 선택됨" : "아직 안 정함"}
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
              등록된 카페가 없습니다 —{" "}
              <Link href="/settings" className="font-medium underline">
                설정 페이지에서 먼저 등록해주세요
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-neutral-700">대표 이미지 URL (선택)</label>
        <Input
          name="imageUrl"
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            if (e.target.value) setVideoUrl("");
          }}
          placeholder="https://..."
        />
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="대표 이미지" className="mt-2 max-h-64 rounded-lg border border-neutral-200" />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-neutral-700">영상 URL (선택)</label>
        <Input
          name="videoUrl"
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            if (e.target.value) setImageUrl("");
          }}
          placeholder="https://..."
        />
        {videoUrl && (
          <video src={videoUrl} controls className="mt-2 max-h-64 w-full rounded-lg border border-neutral-200" />
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "게시 중..." : "수정 내용 다시 등록"}
        </Button>
        <Link href={`/posts/${post.id}`}>
          <Button type="button" variant="ghost">
            취소
          </Button>
        </Link>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
