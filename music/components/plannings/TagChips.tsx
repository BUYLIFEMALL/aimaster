"use client";

/** Suno 다크 스튜디오 스타일 알약형(Pill) 태그 칩 */
export function TagChips({
  options,
  selected,
  max,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  max: number;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        const disabled = !isSelected && selected.length >= max;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
              isSelected
                ? "border-orange-500 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]"
                : disabled
                  ? "border-[#20202c] bg-[#121218] text-zinc-600 cursor-not-allowed"
                  : "border-[#2d2d3e] bg-[#171722] text-zinc-300 hover:border-orange-500/40 hover:text-orange-400 hover:bg-[#1e1e2d]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
