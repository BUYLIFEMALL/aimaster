// 엔진 진행 문구 + 받기 진행 막대(2026-11-04 주인님: 「다운로드 진행중이라는 상태바를 표시하는 기능을 넣어줘야 하는거 아냐」)
// 엔진은 받기 단계마다 「… · 0.8GB / 약 6GB」(engine/src/acestep.mjs progressText)로 보내므로, 그 숫자로 막대를 그린다.
// 예상 크기를 넘으면 엔진이 「약」 부분을 빼서 보내므로 그때는 글자만 보인다.

const RE = /· ([\d.]+)GB \/ 약 ([\d.]+)GB/;

export function parseProgress(stage?: string | null): { done: number; total: number; pct: number } | null {
  const m = stage ? RE.exec(stage) : null;
  if (!m) return null;
  const done = Number(m[1]);
  const total = Number(m[2]);
  if (!(total > 0) || !Number.isFinite(done)) return null;
  return { done, total, pct: Math.min(99, Math.max(1, Math.round((done / total) * 100))) };
}

export function StageProgress({ stage, className = "" }: { stage?: string | null; className?: string }) {
  if (!stage) return null;
  const p = parseProgress(stage);
  return (
    <div className={`space-y-1.5 ${className}`}>
      <p className="text-[11px] text-teal-200/80">
        {stage}
        {p && <span className="ml-1.5 font-bold text-teal-100">{p.pct}%</span>}
      </p>
      {p && (
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700" style={{ width: `${p.pct}%` }} />
        </div>
      )}
    </div>
  );
}
