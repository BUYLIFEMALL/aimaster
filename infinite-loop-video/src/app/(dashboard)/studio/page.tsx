import { LoopTool } from "@/components/tool/LoopTool";
import { LoopModeDiagram } from "@/components/ui/LoopModeDiagram";

export default function StudioPage() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-lv-border bg-lv-surface p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full lv-gradient opacity-20 blur-3xl" />
        <span className="lv-chip">🎬 STEP 1 · 루프 만들기</span>
        <h1 className="mt-3 text-2xl font-extrabold text-lv-text">
          끝과 처음이 <span className="lv-gradient-text">자연스럽게 이어지는</span> 무한 반복 영상
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-lv-muted">
          영상에서 가장 자연스럽게 이어지는 구간을 찾아, 끝없이 반복되는 영상으로 만들어 드립니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="lv-chip">🔒 영상이 서버로 가지 않아요</span>
          <span className="lv-chip">🔑 API 키 필요 없음</span>
          <span className="lv-chip">🎞️ MP4 · WebM · GIF</span>
        </div>
      </div>

      <section className="lv-card">
        <h2 className="lv-section-title">🧭 루프 방식 3가지</h2>
        <LoopModeDiagram />
      </section>

      <LoopTool />
    </div>
  );
}
