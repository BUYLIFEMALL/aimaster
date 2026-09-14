export function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = Math.round((current / total) * 100);
  return (
    <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
      <div
        className="h-full bg-neutral-900 transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
