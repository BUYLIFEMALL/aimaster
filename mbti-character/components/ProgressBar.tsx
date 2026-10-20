export function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = Math.round((current / total) * 100);
  return (
    <div className="w-full h-2 rounded-full bg-[#2a1f4e] overflow-hidden">
      <div
        className="h-full bg-purple-600 transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
