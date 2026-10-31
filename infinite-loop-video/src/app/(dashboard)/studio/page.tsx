import { LoopTool } from "@/components/tool/LoopTool";
import { LoopModeDiagram } from "@/components/ui/LoopModeDiagram";
import { Sparkles, Zap, ShieldCheck, Film, Layers } from "lucide-react";

export default function StudioPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 38. 프로 크리에이터 슬레이트 NLE 랩 스타일 히어로 배너 */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-amber-400 to-blue-500 opacity-15 blur-2xl" />
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 border border-amber-200 text-amber-800">
            <Sparkles size={13} className="text-amber-600" />
            <span>프로 크리에이터 NLE 랩 · STEP 1~4 통합 파이프라인</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
            ● 쇼츠 시청지속률 200% 극대화 알고리즘
          </span>
        </div>

        <h1 className="mt-3.5 text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
          처음과 끝이 <span className="text-amber-600">완벽하게 연결되는</span> 무한 회귀 숏폼 스튜디오
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          영상 속 가장 자연스러운 연결 프레임(SSIM)을 나노 단위로 탐색하여, 시청자가 끝난 줄 눈치채지 못하고 무한 반복 시청하는 고화질 숏폼 루프 영상을 제작합니다.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>브라우저 / 내 PC 고속 렌더 (서버 유출 제로)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Film size={14} className="text-amber-600" />
            <span>MP4 · WebM · 무손실 GIF 다중 포맷</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Zap size={14} className="text-blue-600" />
            <span>9:16 모바일 세로 뷰파인더 최적화</span>
          </span>
        </div>
      </div>

      {/* 루프 알고리즘 3대 모드 다이어그램 덱 */}
      <section id="algorithm" className="lv-card">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers size={18} className="text-amber-600" />
            <span>쇼츠 무한루프 알고리즘 엔진 3대 모드</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">
            상황에 맞는 최적의 루프 기법 선택
          </span>
        </div>
        <LoopModeDiagram />
      </section>

      {/* 메인 루프 툴 (타임라인 & 렌더러 콘솔) */}
      <div id="matching">
        <LoopTool />
      </div>
    </div>
  );
}
