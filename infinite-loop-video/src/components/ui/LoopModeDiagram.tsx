// 루프 방식 3가지를 막대 그림으로 보여 주는 안내 도식 (루프 만들기·매뉴얼 공용)
const MODES = [
  {
    id: "smart",
    icon: "♾️",
    name: "스마트 시임리스 루프",
    badge: "추천 1위",
    desc: "영상 속에서 끝과 처음이 가장 닮은 프레임(SSIM)을 찾아 완벽하게 이어 붙여요.",
    bars: ["opacity-25", "opacity-25", "", "", "", "opacity-25"],
    color: "border-amber-400 bg-amber-50/50",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    id: "overlap",
    icon: "🌊",
    name: "오버랩 디졸브 모드",
    badge: "초고속",
    desc: "분석 없이 영상 전체의 끝 0.6초를 앞 프레임과 자연스럽게 크로스페이드 연결해요.",
    bars: ["", "", "", "", "", ""],
    color: "border-slate-200 bg-slate-50/50",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    id: "bounce",
    icon: "🏓",
    name: "핑퐁 리버스 바운스",
    badge: "무결점",
    desc: "정방향 재생 후 자연스럽게 역방향으로 회귀하여 어떤 영상이든 100% 끊김 없어요.",
    bars: ["", "", "", "", "", ""],
    color: "border-slate-200 bg-slate-50/50",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
  },
];

export function LoopModeDiagram() {
  return (
    <div className="grid gap-3.5 md:grid-cols-3">
      {MODES.map((m) => (
        <div
          key={m.id}
          className={`rounded-xl border p-4.5 transition-all ${m.color}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>{m.icon}</span>
              <span>{m.name}</span>
            </span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${m.badgeColor}`}>
              {m.badge}
            </span>
          </div>

          <div className="mt-3.5 flex items-center gap-1.5" aria-hidden="true">
            {m.id === "bounce" ? (
              <>
                {m.bars.slice(0, 3).map((_, i) => (
                  <span key={i} className="h-6 flex-1 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 shadow-2xs" />
                ))}
                <span className="px-1 text-xs font-bold text-slate-400">⇌</span>
                {m.bars.slice(0, 3).map((_, i) => (
                  <span key={`r${i}`} className="h-6 flex-1 rounded-md bg-gradient-to-l from-blue-400 to-blue-500 shadow-2xs" />
                ))}
              </>
            ) : (
              <>
                {m.bars.map((cls, i) => (
                  <span
                    key={i}
                    className={`h-6 flex-1 rounded-md bg-gradient-to-r from-amber-400 via-amber-500 to-blue-500 shadow-2xs ${cls}`}
                  />
                ))}
                <span className="px-1 text-xs font-bold text-amber-600">↻</span>
              </>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-600 font-medium">
            {m.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
