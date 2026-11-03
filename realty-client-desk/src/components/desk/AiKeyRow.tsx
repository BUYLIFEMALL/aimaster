"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAiKeyAction, saveAiKeyAction } from "@/lib/actions/aiDraft";
import { aiEngine, type AiProvider } from "@/lib/ai/engines";
import { SignupLinks } from "@/components/desk/SignupLinks";

// AI 키 한 줄(OpenAI·Claude·Gemini 공통, v1.08) — 가입·키 만들기 버튼 + 수정·삭제. 키는 공용 user_api_keys(다른 프로그램에서 넣었으면 「등록됨」).
export function AiKeyRow({ provider, maskedValue }: { provider: AiProvider; maskedValue: string | null }) {
  const engine = aiEngine(provider);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await saveAiKeyAction(provider, new FormData(e.currentTarget));
      if (r.error) setError(r.error);
      else { setEditing(false); router.refresh(); }
    } finally { setPending(false); }
  }

  return (
    <div className="rounded-xl border border-mx-border p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-mx-text">{engine.icon} {engine.name} API 키</p>
        <SignupLinks links={[{ label: `${engine.name} 가입하기`, href: engine.signupUrl }, { label: "키 만들기", href: engine.keyUrl }]} />
      </div>
      {maskedValue && !editing ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-mx-muted">{maskedValue} · 등록됨</span>
          <button type="button" onClick={() => setEditing(true)} className="mx-btn-ghost min-h-[36px] px-3 text-xs">✏️ 수정</button>
          {confirmDelete ? (
            <>
              <button type="button" onClick={() => void deleteAiKeyAction(provider).then(() => { setConfirmDelete(false); router.refresh(); })} className="mx-btn-danger min-h-[36px] px-3 text-xs">네, 지우기</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="mx-btn-ghost min-h-[36px] px-3 text-xs">취소</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="mx-btn-ghost min-h-[36px] px-3 text-xs">🗑 삭제</button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <input name="apiKey" type="password" autoComplete="new-password" placeholder={maskedValue ? `새 키 (현재 ${maskedValue})` : `${engine.name} API 키 붙여 넣기`} className="mx-input min-w-[200px] flex-1" />
          <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">{pending ? "저장 중…" : "저장"}</button>
          {maskedValue && <button type="button" onClick={() => { setEditing(false); setError(null); }} className="mx-btn-ghost min-h-[44px] px-4 text-sm">취소</button>}
        </form>
      )}
      {error && <p className="mt-1 text-xs text-mx-danger">{error}</p>}
    </div>
  );
}
