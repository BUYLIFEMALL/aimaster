const SCALE_LABELS = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];

export function QuestionCard({
  text,
  value,
  onAnswer,
}: {
  text: string;
  value: number | undefined;
  onAnswer: (score: number) => void;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-lg font-bold text-neutral-900 mb-6 leading-relaxed">{text}</p>
      <div className="grid grid-cols-5 gap-2">
        {SCALE_LABELS.map((label, idx) => {
          const score = idx + 1;
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onAnswer(score)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-2 transition-colors ${
                selected
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full border-2 ${
                  selected ? "border-white bg-white" : "border-neutral-300"
                }`}
              />
              <span className="text-[10px] leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
