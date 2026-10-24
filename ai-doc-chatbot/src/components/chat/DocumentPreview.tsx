"use client";

import { useEffect, useRef, useState } from "react";
import { EXTRACTION_WARNING_TEXT, type DocumentInfo } from "@/lib/chat/documentRules";

export function DocumentPreview({ id, onClose }: { id: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<{ document: DocumentInfo; text: string; truncated: boolean; previewChunks: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    dialog.current?.showModal();
    fetch(`/api/documents/${encodeURIComponent(id)}`, { cache: "no-store", signal: abort.signal }).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "미리보기를 불러오지 못했습니다.");
      if (!abort.signal.aborted) setPreview(body);
    }).catch((e: Error) => { if (!abort.signal.aborted) setError(e.message); });
    return () => { abort.abort(); };
  }, [id]);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="document-preview-title" className="m-auto w-[calc(100%_-_2rem)] max-w-3xl rounded-2xl border border-[#262c3d] bg-[#161922] p-5 text-slate-100 backdrop:bg-black/60">
    <div className="flex items-center justify-between gap-3"><h2 id="document-preview-title" className="text-sm font-bold">문서 미리보기{preview ? ` · ${preview.document.name}` : ""}</h2><button type="button" autoFocus onClick={onClose} className="rounded-lg border border-[#2d3448] px-3 py-1.5 text-xs">닫기</button></div>
    <p className="mt-2 text-xs text-slate-400">원본 파일 대신 저장된 앞부분 조각을 보여 줍니다. 겹치는 문장이 있을 수 있습니다. 미리보기는 AI 호출 없이 열립니다.</p>
    {error ? <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p> : !preview ? <p role="status" className="mt-3 text-sm">불러오는 중…</p> : <>
      {preview.document.extraction_warning && <p role="status" className="mt-3 text-xs text-amber-200">{EXTRACTION_WARNING_TEXT}</p>}
      <p className="mt-3 text-xs text-slate-400">{preview.previewChunks}개 조각{preview.truncated ? " · 뒤에 저장된 내용이 더 있습니다" : ""}</p>
      <pre className="mt-2 max-h-[60dvh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#0d0f17] p-4 font-sans text-sm">{preview.text || "저장된 본문이 없거나 보관 기간이 지났습니다."}</pre>
    </>}
  </dialog>;
}
