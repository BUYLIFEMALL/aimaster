"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postReplyAction, skipReplyAction } from "@/lib/actions/comments";

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
      setError(err instanceof Error ? `${err.message} (페이지를 새로고침한 뒤 다시 시도해주세요)` : "게시제외에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.");
    } finally {
      setIsSkipping(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-400">{comment.author_display_name ?? "익명"}의 댓글</p>
        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{comment.comment_text}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-1">AI 답글 초안 (수정 가능)</p>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={3}
          className="input"
          placeholder="답글 초안이 없으면 직접 작성해주세요."
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePost}
          disabled={isPosting || !replyText.trim()}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
        >
          {isPosting ? "게시 중..." : "✅ 게시"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isSkipping}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-60"
        >
          ❌ 게시제외
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
