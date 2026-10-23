// v1.11 장식용 파형 막대 — 곡 번호로 정해지는 높이(실제 소리 분석 아님), 재생 중이면 막대가 움직인다.
export function Waveform({ seed, color, active, bars = 36 }: { seed: string; color: string; active?: boolean; bars?: number }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const heights = Array.from({ length: bars }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const wave = Math.sin((i / bars) * Math.PI);
    return 25 + Math.round(((h % 1000) / 1000) * 45 * wave + 20 * wave);
  });
  return (
    <span aria-hidden="true" className="flex h-8 min-w-0 flex-1 items-center gap-[2px]">
      {heights.map((p, i) => (
        <span key={i} className={`w-full max-w-[4px] rounded-full ${color} ${active ? "sl-wave-bar" : "opacity-50"}`}
          style={{ height: `${p}%`, animationDelay: active ? `${(i % 8) * 80}ms` : undefined }} />
      ))}
    </span>
  );
}
