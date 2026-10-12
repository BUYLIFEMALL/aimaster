"use client";

import { Info, SlidersHorizontal } from "lucide-react";
import { EQ_KEYS, EQ_LABELS, type EqKey, type EqPreset, type EqValues, type Lang } from "@/lib/persona/types";
import { STRINGS } from "./i18n";
import { EqSlider } from "./EqSlider";

const COLOR_BY_KEY: Record<EqKey, "primary" | "secondary"> = {
  creativity: "primary",
  clarity: "secondary",
  emotionalDepth: "primary",
  length: "secondary",
  professionalism: "primary",
};

export function EqPanel({
  lang,
  values,
  presets,
  activePresetId,
  onChange,
  onPreset,
}: {
  lang: Lang;
  values: EqValues;
  presets: EqPreset[];
  activePresetId: string | null;
  onChange: (key: EqKey, v: number) => void;
  onPreset: (p: EqPreset) => void;
}) {
  const t = STRINGS[lang];
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-800">
        <SlidersHorizontal size={18} className="text-violet-700" />
        {t.eqTitle}
      </h2>
      <div className="flex h-72 items-end justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        {EQ_KEYS.map((k) => (
          <EqSlider key={k} label={EQ_LABELS[lang][k]} value={values[k]} color={COLOR_BY_KEY[k]} onChange={(v) => onChange(k, v)} />
        ))}
      </div>

      <h3 className="mb-3 mt-6 text-sm font-black text-slate-800">{t.presets}</h3>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPreset(p)}
            className={`rounded-xl border p-3 text-left transition ${
              activePresetId === p.id ? "border-violet-600 bg-white shadow ring-1 ring-violet-200" : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white"
            }`}
          >
            <p className={`text-sm font-bold ${activePresetId === p.id ? "text-violet-700" : "text-slate-800"}`}>{p.name}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{p.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 flex gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-violet-700" />
        <div>
          <p className="mb-1 text-xs font-bold text-slate-700">{t.tipTitle}</p>
          <p className="text-sm leading-relaxed text-slate-600">{t.tip}</p>
        </div>
      </div>
    </aside>
  );
}
