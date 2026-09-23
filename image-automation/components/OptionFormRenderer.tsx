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
      <div className="text-xs text-zinc-500 italic py-2">
        이 모델은 기본 설정으로 작동하며 추가 세부 옵션이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {options.map((opt) => {
        const val = values[opt.id] ?? opt.default;

        return (
          <div key={opt.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300">
                {opt.name}
              </label>
              {opt.type === "slider" && (
                <span className="text-xs font-mono text-amber-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {val}
                </span>
              )}
            </div>

            {opt.type === "select" && opt.options && (
              <select
                value={val}
                onChange={(e) => onChange(opt.id, e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            )}

            {opt.type === "text" && (
              <input
                type="text"
                value={val || ""}
                onChange={(e) => onChange(opt.id, e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            )}

            {opt.type === "boolean" && (
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => onChange(opt.id, e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs text-zinc-400">활성화</span>
              </label>
            )}

            {opt.description && (
              <p className="text-[11px] text-zinc-500 leading-tight">
                {opt.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
