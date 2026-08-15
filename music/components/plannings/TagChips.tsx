"use client";

/** 장르/무드 칩 선택 UI — 최대 개수를 넘기면 더 이상 선택되지 않는다(눌러서 해제는 항상 가능).
 * GenerateTracksPanel(생성하기)과 TrackCard(음악 재생성)에서 동일하게 재사용한다. */
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
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              isSelected
                ? "border-blue-600 bg-blue-600 text-white"
                : disabled
                  ? "border-gray-100 text-gray-300"
                  : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
