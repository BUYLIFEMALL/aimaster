"use client";

import { useState, useTransition } from "react";
import { rememberAiModel } from "@/components/AiModelSelect";
import { IssueLink } from "@/components/PlatformLinks";
import { deleteAiKeyAction, saveAiKeyAction } from "@/lib/actions/connection";
import { AI_MODEL_OPTIONS, AI_PROVIDERS, DEFAULT_AI_MODELS, PROVIDER_LABEL, type AIModelProvider } from "@/lib/ai/models";

// 지침 DESIGN.md 원칙 23: 2단 분리형 카드. 기준 구현 realty-listing-alert AiEngineRow
const ENGINE: Record<AIModelProvider, { icon: string; keyUrl: string; placeholder: string }> = {
  anthropic: { icon: "💎", keyUrl: "https://console.anthropic.com/settings/keys", placeholder: "sk-ant-... 로 시작하는 본인 키" },
  openai: { icon: "🚀", keyUrl: "https://platform.openai.com/api-keys", placeholder: "sk-... 로 시작하는 본인 키" },
  gemini: { icon: "⚡", keyUrl: "https://aistudio.google.com/app/apikey", placeholder: "AIza... 로 시작하는 본인 키" },
};
const ROLE = "문의 답변 초안 · 상품 등록의 검색어·속성 추천";
const small = "rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50";

function EngineCard({ p, mask, savedModel }: { p: AIModelProvider; mask: string; savedModel: string }) {
  const has = !!mask;
  const [model, setModel] = useState(savedModel);
  const [saved, setSaved] = useState(savedModel);
  const [key, setKey] = useState("");
  const [editing, setEditing] = useState(!has);
  const [askDelete, setAskDelete] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setNote("");
      if (key.trim()) {
        const r = await saveAiKeyAction(p, key);
        if (r.error) return setNote(`❌ ${r.error}`);
      } else if (!has) return setNote("❌ API 키를 넣어 주세요.");
      if (model !== saved) {
        if (!(await rememberAiModel(model))) return setNote("❌ 모델을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        setSaved(model);
      }
      setKey("");
      setEditing(false);
      setNote("✅ 저장했습니다.");
    });
  const cancel = () => {
    setModel(saved);
    setKey("");
    setEditing(false);
    setNote("");
  };
  const remove = () =>
    start(async () => {
      const r = await deleteAiKeyAction(p);
      if (r.error) return setNote(`❌ ${r.error}`);
      setAskDelete(false);
      setEditing(true);
      setNote("✅ 삭제했습니다. 다른 프로그램에서도 함께 지워졌습니다.");
    });

  return (
    <div className="space-y-2 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <b className="text-slate-900">{ENGINE[p].icon} {PROVIDER_LABEL[p]}</b>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${has ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{has ? "✓ 등록완료" : "미등록"}</span>
        <span className="min-w-0 flex-1 text-[12px] text-slate-600">{ROLE}</span>
        <IssueLink href={ENGINE[p].keyUrl} />
      </div>
      <div className="grid grid-cols-1 items-center gap-2 text-[13px] sm:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)_auto]">
        {editing ? (
          <input type="password" autoComplete="new-password" aria-label={`${PROVIDER_LABEL[p]} API 키`} placeholder={has ? "새 키(비우면 그대로)" : ENGINE[p].placeholder} value={key} onChange={(e) => setKey(e.target.value)} className="h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 focus:border-blue-500 focus:outline-none" />
        ) : (
          <span className="flex h-9 min-w-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-600">{mask}</span>
        )}
        <select aria-label={`${PROVIDER_LABEL[p]} 모델`} value={model} disabled={!editing || pending} onChange={(e) => setModel(e.target.value)} className="h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none disabled:bg-slate-50">
          {AI_MODEL_OPTIONS.filter((o) => o.provider === p).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-1.5">
          {editing ? (
            <>
              <button type="button" disabled={pending} onClick={save} className={`${small} border-blue-600 bg-blue-700 text-white`}>{pending ? "저장 중…" : "저장"}</button>
              {has && <button type="button" disabled={pending} onClick={cancel} className={`${small} border-slate-300 bg-white text-slate-700`}>취소</button>}
            </>
          ) : askDelete ? (
            <>
              <button type="button" disabled={pending} onClick={remove} className={`${small} border-rose-300 bg-rose-50 text-rose-800`}>정말 삭제</button>
              <button type="button" disabled={pending} onClick={() => setAskDelete(false)} className={`${small} border-slate-300 bg-white text-slate-700`}>취소</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)} className={`${small} border-slate-300 bg-white text-slate-700`}>수정</button>
              <button type="button" onClick={() => setAskDelete(true)} className={`${small} border-slate-300 bg-white text-slate-700`}>삭제</button>
            </>
          )}
        </div>
      </div>
      {note && <p role="status" className="text-[12px] font-bold text-slate-800">{note}</p>}
    </div>
  );
}

/** 회원 본인 AI 키(공용 표 user_api_keys). 다른 프로그램에 등록했으면 그대로 보인다. 화면에는 끝 4자리만 */
export function AiKeyForm({ shown, models }: { shown: Partial<Record<AIModelProvider, string>>; models: Partial<Record<AIModelProvider, string>> }) {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
      {AI_PROVIDERS.map((p) => <EngineCard key={`${p}:${shown[p] ?? ""}`} p={p} mask={shown[p] ?? ""} savedModel={models[p] ?? DEFAULT_AI_MODELS[p]} />)}
    </div>
  );
}
