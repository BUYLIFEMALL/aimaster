"use client";

// D29 문의 「AI 답변 초안」 — 답변 칸에 채우기만 하고, 「답변 달기」는 운영자가 누른다
import { useRef, useState, useTransition } from "react";
import { aiInquiryDraftAction, type InquiryDraftState } from "@/lib/ai-helper-actions";

export default function AiInquiryDraft({ slug, inquiryId }: { slug: string; inquiryId: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<InquiryDraftState | null>(null);
  const [pending, start] = useTransition();

  const ask = () =>
    start(async () => {
      const r = await aiInquiryDraftAction(slug, inquiryId);
      setResult(r);
      if (r.ok) {
        const el = box.current?.closest("form")?.elements.namedItem("answer") as HTMLTextAreaElement | null;
        if (el) {
          el.value = r.draft.answer;
          el.focus();
        }
      }
    });

  return (
    <div ref={box} className="basis-full text-xs" data-ai-inquiry>
      <button type="button" onClick={ask} disabled={pending} className="rounded border border-violet-300 bg-violet-50 px-2 py-1 text-violet-800 disabled:opacity-50">
        {pending ? "초안 만드는 중…" : "🤖 AI 답변 초안"}
      </button>
      {result && !result.ok && (
        <span className="ml-2 text-red-600" data-ai-error>
          {result.error}
          {result.needKey && <> — <a href={`/s/${slug}/admin/settings#ai`} className="underline">키 등록</a></>}
        </span>
      )}
      {result?.ok && (
        <span className="ml-2 text-gray-600">
          답변 칸에 채웠습니다 · 확인 후 「답변 달기」 · {result.cost.model} 약 {result.cost.krw.toLocaleString()}원
          {result.draft.needs_check.length > 0 && <span className="block text-amber-800">확인할 것: {result.draft.needs_check.join(" / ")}</span>}
        </span>
      )}
    </div>
  );
}
