"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postReplyAction, skipReplyAction } from "@/lib/actions/comments";
import { Avatar } from "@/components/ui/StudioHeader";
import { ThLogo } from "@/components/ui/ThLogo";

export interface CommentReviewData {
  id: string;
  author_display_name: string | null;
  comment_text: string;
  generated_reply: string | null;
}

export function CommentReviewItem({ comment }: { comment: CommentReviewData }) {
  const router = useRouter();
  const [replyText, setReplyText] = useState(comment.generated_reply ?? "");
  const [isPosting, setIsPosting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    setError(null);
    setIsPosting(true);
    try {
      const result = await postReplyAction(comment.id, replyText);
      if (result.error) setError(result.error);
      else router.refresh();
    } finally {
      setIsPosting(false);
    }
  }

  async function handleSkip() {
    setError(null);
    setIsSkipping(true);
    try {
      await skipReplyAction(comment.id);
      router.refresh();
    } catch (err) {
      // 배포 직후처럼 브라우저가 이전 빌드의 페이지를 그대로 들고 있으면 서버 액션 호출이
      // 조용히 실패할 수 있어(구버전 액션 ID) 화면에 원인을 보여주고 새로고침을 안내한다.
      setError(err instanceof Error ? `${err.message} (페이지를 새로고침한 뒤 다시 시도해주세요)` : "답변제외에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.");
    } finally {
      setIsSkipping(false);
    }
  }

  return (
    <div className="flex gap-3 py-4">
      <Avatar name={comment.author_display_name} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-th-text">{comment.author_display_name ? `@${comment.author_display_name}` : "익명"}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-th-text">{comment.comment_text}</p>

        {/* 유튜브 답글처럼 들여쓴 "내 채널 답글" 초안 */}
        <div className="mt-3 flex gap-2.5">
          <span className="mt-1"><ThLogo size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold text-th-muted">↳ 내 답글 · AI 초안 (수정 가능)</p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              className="input text-sm"
              placeholder="답글 초안이 없으면 직접 작성해주세요."
            />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={handleSkip} disabled={isSkipping} className="th-btn min-h-[36px] px-4">
                {isSkipping ? "처리 중..." : "답변제외"}
              </button>
              <button
                type="button"
                onClick={handlePost}
                disabled={isPosting || !replyText.trim()}
                className="th-btn-primary min-h-[36px] px-4"
              >
                {isPosting ? "게시 중..." : "답변승인 · 게시"}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-th-danger">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
