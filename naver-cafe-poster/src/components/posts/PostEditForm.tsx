"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { updateAndRepublishPostAction, type PostActionState } from "@/lib/actions/posts";
import type { CafePost, CafeTarget, PostStatus } from "@/types/post";

const initialState: PostActionState = {};

/** 네이버 카페 오픈API는 content를 그대로 HTML로 저장하고(<p>로 감싸짐), 속성이 있는
 * HTML 태그(<img src=...>, <a href=...> 등)가 섞이면 403으로 거부한다는 것을 실계정
 * 테스트로 이미 확인했다(publish-core.ts 주석 참고) — 그래서 이 에디터는 실제로 검증되지
 * 않은 굵게/기울임 같은 HTML 서식 버튼은 넣지 않는다. 대신 실제로 카페에 그대로 반영되는
 * "일반 텍스트 + 줄바꿈(<br>)" 모델에 맞는 서식 도구(문단 나누기/구분선/글머리 기호/강조
 * 괄호)만 제공하고, 발행 시 실제로 어떻게 보일지 아래 미리보기에서 바로 확인할 수 있게 했다.
 */
const TOOLBAR_ACTIONS: { label: string; title: string; before: string; after?: string }[] = [
  { label: "¶ 문단 나누기", title: "커서 위치에 빈 줄을 추가합니다", before: "\n\n" },
  { label: "— 구분선", title: "구분선을 추가합니다", before: "\n──────────\n" },
  { label: "• 목록", title: "글머리 기호가 있는 줄을 추가합니다", before: "\n• " },
  { label: "【강조】", title: "선택한 글자를 【 】로 감쌉니다", before: "【", after: "】" },
  { label: "📢 안내", title: "안내 문구용 이모지를 추가합니다", before: "\n📢 " },
];

function escapeForPreview(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function PostEditForm({ post, targets }: { post: CafePost; targets: CafeTarget[] }) {
  const [state, formAction, isPending] = useActionState(updateAndRepublishPostAction, initialState);
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [targetId, setTargetId] = useState(post.target_id ?? "");
  const [imageUrl, setImageUrl] = useState(post.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(post.video_url ?? "");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const status = post.status as PostStatus;

  const insertAtCursor = (before: string, after = "") => {
    const el = contentRef.current;
    if (!el) {
      setContent((prev) => `${prev}${before}${after}`);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    const cursorPos = start + before.length + selected.length + after.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const previewHtml = escapeForPreview(content).split("\n").join("<br>");
  const charCount = content.length;

  return (
    <form action={formAction} className="space-y-0">
      <input type="hidden" name="postId" value={post.id} />

      {/* 블로그(원문) 서브프로젝트의 "스마트 에디터" 헤더 레이아웃을 참고해, 상단에 고정된
          바에서 취소/등록을 항상 누를 수 있게 했다(2026-09-13 요청 — "고급 버전의 수정기능"). */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center gap-2">
          <Link href={`/posts/${post.id}`} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
            ← 취소
          </Link>
          <span className="text-sm font-bold text-neutral-900">✏️ 게시글 편집기</span>
        </div>
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? "게시 중..." : "수정 내용 다시 등록"}
        </Button>
      </div>

      {state.error && <p className="mb-4 text-xs text-red-600">{state.error}</p>}

      {status === "published" && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          이미 카페에 게시된 글입니다. 네이버 오픈API에는 수정 기능이 없어, 저장하면 카페에{" "}
          <b>새 글로 다시 게시</b>됩니다 — 기존에 올라간 글은 그대로 남아있으니 필요하면 카페에서
          직접 삭제/수정해주세요.
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700">제목</label>
          <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="text-base font-bold" />
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

        {/* 듀얼 패널 에디터: 왼쪽은 실제 입력, 오른쪽은 게시됐을 때 실제로 보일 모습(줄바꿈
            반영) 미리보기 — 큰 화면에서는 나란히, 작은 화면에서는 위아래로 배치. */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 p-2">
            <span className="mr-1 text-xs font-bold text-neutral-500">🛠️ 서식:</span>
            {TOOLBAR_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                title={action.title}
                onClick={() => insertAtCursor(action.before, action.after)}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-blue-50 hover:text-blue-700"
              >
                {action.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-neutral-400">{charCount.toLocaleString()}자</span>
          </div>
          <div className="grid grid-cols-1 divide-neutral-200 lg:grid-cols-2 lg:divide-x">
            <div className="p-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">본문 입력</p>
              <Textarea
                ref={contentRef}
                name="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={18}
                required
                className="border-0 p-0 text-sm leading-relaxed focus:ring-0"
              />
            </div>
            <div className="border-t border-neutral-200 p-3 lg:border-t-0">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                👁️ 게시 미리보기
              </p>
              <div
                className="min-h-[420px] whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-900"
                dangerouslySetInnerHTML={{ __html: previewHtml || "<span class='text-neutral-400'>본문을 입력하면 여기에 실제 게시 모습이 미리 보입니다.</span>" }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <img src={imageUrl} alt="대표 이미지" className="mt-2 max-h-48 rounded-lg border border-neutral-200" />
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
              <video src={videoUrl} controls className="mt-2 max-h-48 w-full rounded-lg border border-neutral-200" />
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
