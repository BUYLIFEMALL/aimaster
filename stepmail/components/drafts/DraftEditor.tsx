"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { updateDraftAction, deleteDraftAction } from "@/lib/actions/drafts";

// TipTap은 브라우저 DOM에 의존하므로 SSR 없이 클라이언트에서만 로드한다.
const EmailRichTextEditor = dynamic(() => import("./EmailRichTextEditor"), {
  ssr: false,
  loading: () => <div className="border border-gray-200 rounded-xl min-h-[280px] bg-gray-50 animate-pulse" />,
});

export interface DraftEditorData {
  id: string;
  subject: string;
  body_html: string;
}

export function DraftEditor({ draft }: { draft: DraftEditorData }) {
  const router = useRouter();
  const [subject, setSubject] = useState(draft.subject);
  const [bodyHtml, setBodyHtml] = useState(draft.body_html);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // 저장에 성공한 최종 결과물만 하단 미리보기에 반영한다(편집 중인 값이 아니라 실제로 저장된
  // 값을 보여줘야, 이 미리보기가 "곧 예약 발송에 쓰일 진짜 최종본"이라는 신뢰를 줄 수 있다).
  // draft는 이미 AI 생성 시점에 저장된 값이라, 진입 시점부터 바로 보여준다.
  const [savedPreview, setSavedPreview] = useState({ subject: draft.subject, bodyHtml: draft.body_html });

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      const result = await updateDraftAction(draft.id, subject, bodyHtml);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setSavedPreview({ subject, bodyHtml });
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteDraftAction(draft.id);
      if (result.error) {
        setError(result.error);
        setIsDeleting(false);
      } else {
        router.push("/drafts");
      }
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">제목</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-semibold text-gray-700">본문</label>
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              {showCode ? "편집기로 보기" : "HTML 코드로 편집"}
            </button>
          </div>
          {showCode ? (
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={14}
              className="input font-mono text-xs whitespace-pre-wrap"
            />
          ) : (
            <EmailRichTextEditor value={bodyHtml} onChange={setBodyHtml} />
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">저장되었습니다.</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl transition-all"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-60 transition-colors"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-bold text-gray-500">✅ 저장된 최종 결과물 미리보기 (실제 발송될 내용)</p>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm font-bold text-gray-900">{savedPreview.subject}</p>
          <div
            className="border border-gray-100 rounded-xl p-4 bg-gray-50 text-sm"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: savedPreview.bodyHtml }}
          />
        </div>

        <Link
          href={`/campaigns/new?draftId=${draft.id}`}
          className="block text-center bg-blue-50 hover:bg-blue-100 transition-colors p-4 text-sm font-bold text-blue-600 border-t border-gray-100"
        >
          📤 이 이메일로 예약 발송 캠페인 만들기 →
        </Link>
      </div>
    </div>
  );
}
