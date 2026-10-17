"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postReplyAction, skipReplyAction } from "@/lib/actions/conversations";
import { Avatar } from "@/components/ui/StudioHeader";

export interface DmReviewData {
  id: string;
  sender_username: string | null;
  message_text: string;
  generated_reply: string | null;
}

export function ConversationReviewItem({ message }: { message: DmReviewData }) {
  const router = useRouter();
  const [replyText, setReplyText] = useState(message.generated_reply ?? "");
  const [isPosting, setIsPosting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    setError(null);
    setIsPosting(true);
    try {
      const result = await postReplyAction(message.id, replyText);
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
      await skipReplyAction(message.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? `${err.message} (페이지를 새로고침한 뒤 다시 시도해주세요)` : "답변제외에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.");
    } finally {
      setIsSkipping(false);
    }
  }

  return (
    <div className="space-y-2 py-4">
      {/* 고객 메시지 — 인스타 DM처럼 왼쪽 회색 말풍선 */}
      <div className="flex items-end gap-2">
        <Avatar name={message.sender_username} size={28} />
        <p className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-bl-md bg-ig-raised px-4 py-2.5 text-sm text-ig-text">
          {message.message_text}
        </p>
      </div>

      {/* 내 답장 초안 — 오른쪽 파랑 말풍선 모양 입력칸 */}
      <div className="flex flex-col items-end">
        <p className="mb-1 text-[11px] font-semibold text-ig-muted">↳ 내 답장 · AI 초안 (수정 가능)</p>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={3}
          className="w-full max-w-[85%] rounded-3xl rounded-br-md border-0 bg-ig-primary px-4 py-2.5 text-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-ig-primary/40"
          placeholder="답장 초안이 없으면 직접 작성해주세요."
        />
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={handleSkip} disabled={isSkipping} className="ig-btn min-h-[36px] px-4">
            {isSkipping ? "처리 중..." : "답변제외"}
          </button>
          <button
            type="button"
            onClick={handlePost}
            disabled={isPosting || !replyText.trim()}
            className="ig-btn-primary min-h-[36px] px-4"
          >
            {isPosting ? "발송 중..." : "답변승인 · 발송"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-ig-danger">{error}</p>}
      </div>
    </div>
  );
}
