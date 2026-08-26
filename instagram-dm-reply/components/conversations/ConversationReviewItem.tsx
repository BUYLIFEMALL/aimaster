"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postReplyAction, skipReplyAction } from "@/lib/actions/conversations";

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
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-400">{message.sender_username ?? "고객"}이 보낸 DM</p>
        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{message.message_text}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-1">AI 답장 초안 (수정 가능)</p>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={3}
          className="input"
          placeholder="답장 초안이 없으면 직접 작성해주세요."
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePost}
          disabled={isPosting || !replyText.trim()}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
        >
          {isPosting ? "승인 중..." : "✅ 답변승인"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isSkipping}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-60"
        >
          ❌ 답변제외
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
