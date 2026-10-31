"use client";

import { useState, useTransition } from "react";
import { deleteAiKeyAction, saveAiKeyAction } from "@/lib/actions/connection";
import { rememberAiModel } from "@/components/AiModelSelect";
import { AI_MODEL_OPTIONS, AI_PROVIDERS, DEFAULT_AI_MODELS, PROVIDER_LABEL, type AIModelProvider } from "@/lib/ai/models";

/** 회원 본인 AI 키(공용 표 user_api_keys). 다른 프로그램에 등록했으면 그대로 보인다. 화면에는 끝 4자리만 */
export function AiKeyForm({ shown, models }: { shown: Partial<Record<AIModelProvider, string>>; models: Partial<Record<AIModelProvider, string>> }) {
  const [chosen, setChosen] = useState(models);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [note, setNote] = useState({ at: "", text: "" });
  const [pending, start] = useTransition();
  const choose = (p: AIModelProvider, model: string) => {
    setChosen((old) => ({ ...old, [p]: model }));
    start(async () => {
      const saved = await rememberAiModel(model);
      setNote({ at: p, text: saved ? "✅ 모델을 저장했습니다." : "❌ 모델을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    });
  };
  const run = (work: () => Promise<{ ok?: boolean; error?: string }>, provider: AIModelProvider, done: string) =>
    start(async () => {
      const r = await work();
      setNote({ at: provider, text: r.error ? `❌ ${r.error}` : `✅ ${done}` });
      if (!r.error) setDraft((old) => ({ ...old, [provider]: "" }));
    });
  return (
    <div className="space-y-2">
      {AI_PROVIDERS.map((p) => (
        <div key={p} className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="w-36 shrink-0 font-bold text-slate-700">{PROVIDER_LABEL[p]}</span>
          <input type="password" autoComplete="new-password" aria-label={`${PROVIDER_LABEL[p]} API 키`} placeholder={shown[p] ? `저장됨 ${shown[p]} — 바꿀 때만 입력` : "API 키"} value={draft[p] ?? ""} onChange={(e) => setDraft({ ...draft, [p]: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 focus:border-blue-500 focus:outline-none" />
          <button type="button" disabled={pending || !(draft[p] ?? "").trim()} onClick={() => run(() => saveAiKeyAction(p, draft[p]), p, "저장했습니다.")} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">저장</button>
          <select aria-label={`${PROVIDER_LABEL[p]} 모델`} value={chosen[p] ?? DEFAULT_AI_MODELS[p]} disabled={pending} onChange={(e) => choose(p, e.target.value)} className="min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none">
            {AI_MODEL_OPTIONS.filter((o) => o.provider === p).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {shown[p] && <button type="button" disabled={pending} onClick={() => run(() => deleteAiKeyAction(p), p, "삭제했습니다.")} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">삭제</button>}
          {note.at === p && <p role="status" className="w-full text-[12px] font-bold text-slate-800">{note.text}</p>}
        </div>
      ))}
    </div>
  );
}
