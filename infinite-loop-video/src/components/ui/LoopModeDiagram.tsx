// 루프 방식 3가지를 막대 그림으로 보여 주는 안내 도식 (루프 만들기·매뉴얼 공용, 2026-10-17 디자인 리뉴얼).
// 실제 처리 로직과 무관한 설명용 그림이다.
const MODES = [
  {
    id: "smart",
    icon: "✨",
    name: "스마트 루프",
    badge: "권장",
    desc: "영상 속에서 끝과 처음이 가장 닮은 구간을 찾아 부드럽게 이어 붙여요.",
    bars: ["opacity-30", "opacity-30", "", "", "", "opacity-30"],
  },
  {
    id: "overlap",
    icon: "🔁",
    name: "강제 오버랩",
    badge: "빠름",
    desc: "분석 없이 영상 전체의 끝과 처음을 1초 겹쳐 이어요.",
    bars: ["", "", "", "", "", ""],
  },
  {
    id: "bounce",
    icon: "↔️",
    name: "바운스",
    badge: "왕복",
    desc: "앞으로 갔다가 거꾸로 돌아오는 반복이에요. 어떤 영상이든 끊김 없이 이어져요.",
    bars: ["", "", "", "", "", ""],
  },
];

export function LoopModeDiagram() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {MODES.map((m) => (
        <div key={m.id} className="rounded-xl border border-lv-border bg-lv-raised p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-lv-text">
              {m.icon} {m.name}
            </span>
            <span className="lv-chip">{m.badge}</span>
          </div>
          <div className="mt-3 flex items-center gap-1" aria-hidden="true">
            {m.id === "bounce" ? (
              <>
                {m.bars.slice(0, 3).map((_, i) => (
                  <span key={i} className="h-6 flex-1 rounded lv-gradient" />
                ))}
                <span className="px-1 text-xs text-lv-muted">↩</span>
                {m.bars.slice(0, 3).map((_, i) => (
                  <span key={`r${i}`} className="h-6 flex-1 rounded bg-gradient-to-l from-lv-pink to-lv-cyan" />
                ))}
              </>
            ) : (
              <>
                {m.bars.map((cls, i) => (
                  <span key={i} className={`h-6 flex-1 rounded lv-gradient ${cls}`} />
                ))}
                <span className="px-1 text-xs text-lv-cyan">↻</span>
              </>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-lv-muted">{m.desc}</p>
        </div>
      ))}
    </div>
  );
}
