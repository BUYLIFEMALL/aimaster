"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { updateReportAction, deleteReportAction, type UpdateReportState } from "@/lib/actions/reports";
import { isHtmlContent, toEditorHtml } from "@/lib/reportContent";

const updateInitialState: UpdateReportState = {};

interface ReportEditorProps {
  reportId: string;
  userId: string;
  title: string;
  content: string;
  /** /reports 목록의 "수정" 링크(?edit=1)로 들어왔을 때 바로 편집 모드로 연다. */
  initialEditing?: boolean;
}

/**
 * 리포트 상세 화면의 제목/본문을 직접 수정하거나 삭제하는 UI. 평소엔 생성된 그대로
 * 보여주다가 "✏️ 수정" 버튼을 누르면 RichTextEditor(이미지/영상 삽입 가능)로 바뀐다.
 */
export function ReportEditor({ reportId, userId, title, content, initialEditing = false }: ReportEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(() => toEditorHtml(content));
  const [state, formAction, isSaving] = useActionState(updateReportAction, updateInitialState);
  const [isDeleting, setIsDeleting] = useState(false);

  function startEditing() {
    setEditTitle(title);
    setEditContent(toEditorHtml(content));
    setIsEditing(true);
  }

  async function handleSave(formData: FormData) {
    formData.set("id", reportId);
    formData.set("title", editTitle);
    formData.set("content", editContent);
    const result = await updateReportAction(updateInitialState, formData);
    if (!result.error) {
      setIsEditing(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("이 리포트를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setIsDeleting(true);
    const formData = new FormData();
    formData.set("id", reportId);
    await deleteReportAction(formData);
  }

  if (!isEditing) {
    return (
      <div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={startEditing} className="text-xs font-semibold text-blue-600 hover:underline">
              ✏️ 수정
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
        {isHtmlContent(content) ? (
          <div className="prose-report mb-6" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div className="mb-6 whitespace-pre-line text-sm leading-relaxed text-neutral-800">{content}</div>
        )}
      </div>
    );
  }

  return (
    <form action={handleSave}>
      <label className="mb-1 block text-xs font-semibold text-neutral-700">제목</label>
      <input
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-neutral-900"
      />
      <label className="mb-1 block text-xs font-semibold text-neutral-700">본문 (이미지/영상 삽입 가능)</label>
      <RichTextEditor value={editContent} onChange={setEditContent} userId={userId} className="mb-3" />
      {state.error && <p className="mb-2 text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
          취소
        </Button>
      </div>
    </form>
  );
}
