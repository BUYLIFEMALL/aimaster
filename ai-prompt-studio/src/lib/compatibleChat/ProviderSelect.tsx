"use client";

import { ACTIVE_PROVIDERS, type ChatSelection, type LegacyProvider } from "./config";

export function ProviderSelect({ value, onChange, legacy, disabled, dark = false }: {
  value: ChatSelection; onChange: (value: ChatSelection) => void; legacy: LegacyProvider; disabled?: boolean; dark?: boolean;
}) {
  const original = legacy === "upstage" ? { name: "Upstage · 기존 Solar", model: "solar-pro4" } : { name: "Gemini · 기존 실행", model: "gemini-2.5-flash" };
  const picked = ACTIVE_PROVIDERS.find((p) => p.id === value.provider);
  const input = `mt-1 w-full min-w-0 rounded-lg border px-2 py-2 text-xs ${dark ? "border-slate-700 bg-[#11141c] text-slate-200" : "border-slate-300 bg-white text-slate-800"}`;
  return <fieldset disabled={disabled} className={`space-y-2 text-xs ${dark ? "text-slate-300" : "text-slate-600"}`}>
    <legend className="font-semibold">실행할 AI</legend>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="min-w-0">공급자<select className={input} value={value.provider} onChange={(e) => {
        const next = ACTIVE_PROVIDERS.find((p) => p.id === e.target.value);
        onChange(next ? { provider: next.id, model: next.models[0] } : { provider: legacy, model: original.model });
      }}><option value={legacy}>{original.name}</option>{ACTIVE_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="min-w-0">모델<select className={input} value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })}>
        {(picked?.models ?? [original.model]).map((model) => <option key={model} value={model}>{model}</option>)}
      </select></label>
    </div>
    {picked && <p className="leading-relaxed">{picked.note} 본인 키를 설정에서 한 번 등록하면 다른 프로그램에서도 재사용합니다. 무료 한도 초과 시 유료 모델로 바꾸지 않습니다.</p>}
  </fieldset>;
}
