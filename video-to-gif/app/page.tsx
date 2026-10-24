import Link from "next/link";
import {
  Film,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sliders,
  Cpu,
  Layers,
  FileCheck,
  Play,
  Monitor,
  Activity,
  Maximize2
} from "lucide-react";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#090d13] text-[#f0f6fc] relative overflow-hidden">
      {/* 배경 시네마틱 앰비언트 글로우 */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 relative z-10">
        {/* 상단 네비게이션 */}
        <header className="grid grid-cols-3 items-center border-b border-[#30363d]/60 pb-5">
          <nav className="flex items-center gap-3 text-sm justify-self-start">
            <a href={MAIN_SITE_URL} className="text-gray-400 hover:text-white transition-colors">
              AIMaster 메인
            </a>
            <span className="text-gray-600">/</span>
            <Link href="/guide" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1">
              <span>연동 & 사용 매뉴얼</span>
            </Link>
          </nav>

          <Link href="/" className="justify-self-center flex items-center gap-2 text-lg font-black tracking-tight group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Film className="h-4 w-4" />
            </div>
            <span>
              Video<span className="text-amber-400">Render</span> <span className="text-xs font-semibold text-gray-400">Studio</span>
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="justify-self-end rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-extrabold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
          >
            <span>스튜디오 가동</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        {/* 메인 히어로 섹션 */}
        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr]">
          {/* 좌측: 타이틀 & 특장점 */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>초고속 영상 렌더링 & 고화질 GIF 스튜디오</span>
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-[1.15] tracking-tight sm:text-6xl text-white">
              영상을 더 빠르게,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">
                초고화질 렌더링
              </span>으로.
            </h1>

            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-gray-300 font-normal">
              무설치 브라우저 WASM 엔진부터 3배 빠른 내 PC 하드웨어 가속까지 완벽 지원합니다.
              타임라인 정밀 구간 자르기와 10단계 지능형 용량 사다리로 가볍고 선명한 결과물을 완성하세요.
            </p>

            {/* 시네마틱 4대 핵심 기능 카드 그리드 */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl text-xs">
              <div className="flex items-start gap-3 rounded-xl border border-[#30363d] bg-[#161b22]/80 p-3.5 backdrop-blur-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                  <Sliders className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-bold text-white">0.1초 타임라인 정밀 편집</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">듀얼 핸들 자르기 & 프레임 실시간 보기</div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-[#30363d] bg-[#161b22]/80 p-3.5 backdrop-blur-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-bold text-white">2-Track 초고속 렌더링</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">무설치 WASM & 내 PC 하드웨어 3배 가속</div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-[#30363d] bg-[#161b22]/80 p-3.5 backdrop-blur-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-bold text-white">10단계 지능형 사다리</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">8MiB 자동 탐색 및 FPS 자동 최적화</div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-[#30363d] bg-[#161b22]/80 p-3.5 backdrop-blur-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-bold text-white">100% 로컬 무저장 원칙</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">서버 전송 없음 · 완벽한 프라이버시</div>
                </div>
              </div>
            </div>

            {/* CTA 액션 버튼 */}
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link
                href="/dashboard"
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                <span>스튜디오 시작하기</span>
              </Link>
              <Link
                href="/guide"
                className="rounded-xl border border-[#30363d] bg-[#161b22] px-5 py-3.5 text-sm font-bold text-gray-300 hover:border-amber-500/40 hover:text-white transition-all flex items-center gap-2"
              >
                <span>📖 연동 & 사용 가이드</span>
              </Link>
            </div>
          </div>

          {/* 우측: 시네마틱 비디오 렌더러 NLE 콘솔 비주얼 그래픽 */}
          <div className="relative">
            <div className="relative rounded-3xl border border-amber-500/30 bg-[#161b22]/90 p-5 shadow-2xl backdrop-blur-xl">
              {/* 뷰파인더 코너 브래킷 */}
              <div className="viewfinder-corner-tl" />
              <div className="viewfinder-corner-tr" />
              <div className="viewfinder-corner-bl" />
              <div className="viewfinder-corner-br" />

              {/* 1. 상단 뷰파인더 모니터 헤더 */}
              <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 border-b border-[#30363d]/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-bold text-red-400">REC 00:02:18:14</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 font-bold">4K UHD</span>
                    <span>60 FPS</span>
                    <span className="text-emerald-400">HARDWARE ACCEL</span>
                  </div>
                </div>

                {/* 중앙 비디오 프레임 프리뷰 화면 */}
                <div className="relative mt-3 h-48 w-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center border border-white/5 overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(#30363d_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                  
                  {/* 중앙 포커스 서클 & 크로스헤어 */}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-amber-400/60 flex items-center justify-center animate-spin" style={{ animationDuration: "20s" }}>
                      <Film className="h-7 w-7 text-amber-400" />
                    </div>
                    <span className="text-xs font-bold tracking-wider text-gray-300 font-mono">
                      VIDEO RENDER ENGINE v1.25
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ⚡ SINGLE-PASS OPTIMIZED
                    </span>
                  </div>

                  {/* 하단 오디오 레벨 미터 */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-gray-500">
                    <span>CH 1/2</span>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-6 rounded-full bg-emerald-500" />
                      <div className="h-1.5 w-8 rounded-full bg-emerald-500" />
                      <div className="h-1.5 w-4 rounded-full bg-amber-500" />
                      <div className="h-1.5 w-2 rounded-full bg-red-500" />
                    </div>
                    <span>-14.0 LUFS</span>
                  </div>
                </div>

                {/* 2. 타임라인 트랙 & 인아웃 마커 시각화 */}
                <div className="mt-3 rounded-xl bg-[#161b22] p-2.5 border border-[#30363d] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span className="text-amber-400 font-bold">TIMELINE [0.1s 정밀 자르기]</span>
                    <span>01:00 ~ 03:20 (구간 2.2초)</span>
                  </div>
                  
                  {/* 비디오 트랙 1 */}
                  <div className="relative h-6 w-full rounded-md bg-[#0d1117] border border-[#30363d] flex items-center overflow-hidden">
                    <div className="absolute left-[20%] right-[30%] h-full bg-amber-500/30 border-l-2 border-r-2 border-amber-400 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-amber-200">IN / OUT RENDER ZONE</span>
                    </div>
                    <div className="w-full flex justify-between px-1 opacity-20">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="h-3 w-px bg-white" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. 하단 렌더링 큐 시각화 카드 */}
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold px-1">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    <span>실시간 렌더링 큐</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">3 / 20 JOBS READY</span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3 flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
                      GIF
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-bold text-gray-200">4k-product-showcase.mp4</span>
                        <span className="text-amber-300 font-mono text-[11px]">8.12 MiB (100%)</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[#161b22]">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: "100%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3 flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-xs border border-cyan-500/30">
                      MP4
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-bold text-gray-200">cinematic-motion-loop.mov</span>
                        <span className="text-cyan-300 font-mono text-[11px]">NORMALIZE & COMPRESS</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[#161b22]">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: "100%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단 엔진 상태 뱃지 */}
              <div className="mt-3.5 flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 text-[11px] font-mono border border-white/5">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  WASM & PC ACCELERATOR ACTIVE
                </span>
                <span className="text-gray-400">0% CPU OVERHEAD SERVERLESS</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
