"use client";

import { ModelOptionSchema } from "@/lib/providers/types";
import { Dice5, HelpCircle, Lock, Plus, Trash2 } from "lucide-react";

interface OptionFormRendererProps {
  options: ModelOptionSchema[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function OptionFormRenderer({ options, values, onChange }: OptionFormRendererProps) {
  if (!options || options.length === 0) {
    return (
      <div className="text-sm text-zinc-400 italic py-4 text-center border border-dashed border-zinc-800 rounded-xl">
        이 모델은 기본 설정으로 작동하며 추가 세부 옵션이 없습니다.
      </div>
    );
  }

  // Replicate conditional check: aspect_ratio === "custom"
  const currentAspectRatio = values["aspect_ratio"];
  const isCustomRatio = currentAspectRatio === "custom";

  const handleRandomSeed = (optId: string) => {
    const randomSeed = Math.floor(Math.random() * 2147483647);
    onChange(optId, randomSeed.toString());
  };

  return (
    <div className="space-y-5 font-sans">
      {options.map((opt) => {
        const val = values[opt.id] ?? opt.default;

        // Conditional state for width & height
        const isDimensionField = opt.id === "width" || opt.id === "height";
        const isDisabledDimension = isDimensionField && currentAspectRatio && !isCustomRatio;

        // Type badges matching Replicate style (= string, # integer, [ ] array)
        let typeBadge = "= string";
        if (opt.type === "slider") {
          typeBadge = Number.isInteger(opt.step || 1) ? "# integer" : "# number";
        } else if (opt.type === "select") {
          typeBadge = "= string";
        } else if (opt.type === "boolean") {
          typeBadge = "toggle";
        }

        return (
          <div
            key={opt.id}
            className={`space-y-2 rounded-xl p-3.5 border transition-all ${
              isDisabledDimension
                ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700/80"
            }`}
          >
            {/* Field Header - Replicate Style */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {typeBadge}
                </span>
                <span className="font-mono text-sm font-bold text-zinc-100">
                  {opt.id}
                </span>
                <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
                  ({opt.name.split("(")[0].trim()})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {opt.default !== undefined && (
                  <span className="text-[11px] font-mono text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
                    default: {typeof opt.default === "string" ? `"${opt.default}"` : String(opt.default)}
                  </span>
                )}
                {opt.type === "slider" && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={opt.min ?? 0}
                      max={opt.max ?? 10000}
                      step={opt.step ?? 1}
                      value={val}
                      disabled={isDisabledDimension}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        if (!isNaN(parsed)) {
                          onChange(opt.id, parsed);
                        } else {
                          onChange(opt.id, e.target.value);
                        }
                      }}
                      className="w-20 font-mono text-xs font-bold text-amber-400 bg-zinc-950 px-2 py-1 rounded border border-amber-500/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none text-right disabled:opacity-40 disabled:cursor-not-allowed"
                      title="원하는 숫자를 직접 키보드로 입력할 수 있습니다"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Field Controls */}
            {opt.type === "select" && opt.options && (
              <select
                value={val}
                onChange={(e) => onChange(opt.id, e.target.value)}
                className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 font-medium focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {opt.options.map((item) => (
                  <option key={String(item.value)} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            )}

            {opt.type === "slider" && (
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={opt.min ?? 0}
                  max={opt.max ?? 100}
                  step={opt.step ?? 1}
                  value={val}
                  disabled={isDisabledDimension}
                  onChange={(e) => onChange(opt.id, parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-zinc-800 h-2 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="flex justify-between text-[11px] text-zinc-300 font-mono">
                  <span>min: {opt.min ?? 0}</span>
                  <span>step: {opt.step ?? 1}</span>
                  <span>max: {opt.max ?? 100}</span>
                </div>
              </div>
            )}

            {opt.type === "text" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={val || ""}
                  onChange={(e) => onChange(opt.id, e.target.value)}
                  placeholder={opt.id === "seed" ? "예: 42 또는 무작위 (비워둠)" : ""}
                  className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {opt.id === "seed" && (
                  <button
                    type="button"
                    onClick={() => handleRandomSeed(opt.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 shrink-0"
                    title="랜덤 시드 번호 생성"
                  >
                    <Dice5 className="h-4 w-4" />
                    <span>랜덤</span>
                  </button>
                )}
              </div>
            )}

            {opt.type === "boolean" && (
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => onChange(opt.id, e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-zinc-300 font-medium">활성화 (true)</span>
              </label>
            )}

            {/* Description & Warnings */}
            {isDisabledDimension ? (
              <p className="text-xs text-amber-400/80 flex items-center gap-1.5 font-medium pt-1">
                <Lock className="h-3.5 w-3.5" />
                <span>화면 비율(aspect_ratio)이 &quot;custom&quot;으로 선택되었을 때만 직접 조정이 가능합니다.</span>
              </p>
            ) : (
              opt.description && (
                <p className="text-xs text-zinc-300 leading-relaxed font-sans pt-0.5">
                  {opt.description}
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

