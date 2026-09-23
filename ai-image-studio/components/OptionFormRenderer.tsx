"use client";

import { ModelOptionSchema } from "@/lib/providers/types";

interface OptionFormRendererProps {
  options: ModelOptionSchema[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function OptionFormRenderer({ options, values, onChange }: OptionFormRendererProps) {
  if (!options || options.length === 0) {
    return (
      <div className="text-sm text-zinc-400 italic py-2">
        이 모델은 기본 설정으로 작동하며 추가 세부 옵션이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {options.map((opt) => {
        const val = values[opt.id] ?? opt.default;

        return (
          <div key={opt.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-zinc-200">
                {opt.name}
              </label>
              {opt.type === "slider" && (
                <span className="text-sm font-mono font-bold text-amber-400 bg-zinc-900 px-2.5 py-0.5 rounded border border-zinc-700">
                  {val}
                </span>
              )}
            </div>

            {opt.type === "select" && opt.options && (
              <select
                value={val}
                onChange={(e) => onChange(opt.id, e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-100 font-medium focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                {opt.options.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            )}

            {opt.type === "slider" && (
              <input
                type="range"
                min={opt.min ?? 0}
                max={opt.max ?? 100}
                step={opt.step ?? 1}
                value={val}
                onChange={(e) => onChange(opt.id, parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
              />
            )}

            {opt.type === "text" && (
              <input
                type="text"
                value={val || ""}
                onChange={(e) => onChange(opt.id, e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-100 font-medium focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            )}

            {opt.type === "boolean" && (
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => onChange(opt.id, e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-zinc-300 font-medium">활성화</span>
              </label>
            )}

            {opt.description && (
              <p className="text-xs text-zinc-400 leading-relaxed">
                {opt.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
