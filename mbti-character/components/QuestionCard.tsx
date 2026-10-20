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
    <div className="rounded-3xl border border-[#2a1f4e] bg-[#120d24] p-6 shadow-sm">
      <p className="text-lg font-bold text-slate-100 mb-6 leading-relaxed">{text}</p>
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
                  ? "border-purple-400 bg-purple-600 text-white"
                  : "border-[#2a1f4e] text-slate-400 hover:border-purple-500/60"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full border-2 ${
                  selected ? "border-white bg-[#120d24]" : "border-[#3e2e70]"
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
