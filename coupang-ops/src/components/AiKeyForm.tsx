"use client";

import { useState, useTransition } from "react";
import { deleteAiKeyAction, saveAiKeyAction } from "@/lib/actions/connection";
import { AI_PROVIDERS, PROVIDER_LABEL, type AIModelProvider } from "@/lib/ai/models";

/** 회원 본인 AI 키(공용 표 user_api_keys). 다른 프로그램에 등록했으면 그대로 보인다. 화면에는 끝 4자리만 */
export function AiKeyForm({ shown }: { shown: Partial<Record<AIModelProvider, string>> }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const run = (work: () => Promise<{ ok?: boolean; error?: string }>, provider: AIModelProvider) =>
    start(async () => {
      const r = await work();
      setNote(r.error ? `❌ ${r.error}` : "✅ 처리했습니다.");
      if (!r.error) setDraft((old) => ({ ...old, [provider]: "" }));
    });
  return (
    <div className="space-y-2">
      {AI_PROVIDERS.map((p) => (
        <div key={p} className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="w-36 shrink-0 font-bold text-slate-700">{PROVIDER_LABEL[p]}</span>
          <input type="password" autoComplete="new-password" aria-label={`${PROVIDER_LABEL[p]} API 키`} placeholder={shown[p] ? `저장됨 ${shown[p]} — 바꿀 때만 입력` : "API 키"} value={draft[p] ?? ""} onChange={(e) => setDraft({ ...draft, [p]: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 focus:border-blue-500 focus:outline-none" />
          <button type="button" disabled={pending || !(draft[p] ?? "").trim()} onClick={() => run(() => saveAiKeyAction(p, draft[p]), p)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">저장</button>
          {shown[p] && <button type="button" disabled={pending} onClick={() => run(() => deleteAiKeyAction(p), p)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">삭제</button>}
        </div>
      ))}
      {note && <p className="text-[12px] text-slate-800">{note}</p>}
    </div>
  );
}
