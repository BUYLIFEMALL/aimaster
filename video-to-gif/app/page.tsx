import Link from "next/link";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="grid grid-cols-3 items-center">
          <nav className="flex items-center gap-3 text-sm justify-self-start">
            <a href={MAIN_SITE_URL} className="text-slate-300 hover:text-white">AIMaster 메인</a>
            <Link href="/guide" className="text-amber-400 hover:text-amber-300 font-semibold">연동 & 사용 매뉴얼</Link>
          </nav>
          <Link href="/" className="justify-self-center text-lg font-black tracking-tight">
            Video<span className="text-amber-400">Render</span> <span className="text-xs font-semibold text-slate-400">Studio</span>
          </Link>
          <Link href="/dashboard" className="justify-self-end rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-sm font-bold text-amber-300 hover:bg-amber-500/30">스튜디오 가동</Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
              ⚡ 초고속 영상 렌더링 & 고화질 GIF 스튜디오
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight sm:text-7xl">
              영상을 더 빠르게,<br />
              <span className="text-amber-400">초고화질 렌더링</span>으로.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              무설치 브라우저 WASM 엔진부터 3배 빠른 내 PC 하드웨어 가속까지 지원합니다.
              타임라인 정밀 구간 편집과 지능형 압축 사다리로 가볍고 선명한 GIF 및 영상을 완성하세요.
            </p>
            <ul className="mt-5 max-w-xl space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <span>✂️</span>
                <span><strong>0.1초 타임라인 구간 편집</strong> · 프레임 장면 미리보기와 구간 루프 재생</span>
              </li>
              <li className="flex items-center gap-2">
                <span>⚡</span>
                <span><strong>2-Track 초고속 렌더링</strong> · 브라우저 WASM 무설치 & 내 PC 가속 (WASM 대비 3배)</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📉</span>
                <span><strong>지능형 용량 사다리</strong> · 8MiB 자동 최적화 탐색으로 화질 손실 최소화</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📦</span>
                <span><strong>최대 20개 일괄 큐</strong> · MP4/MOV 등 원본 일괄 등록 및 무손실 ZIP 패키징</span>
              </li>
              <li className="flex items-center gap-2">
                <span>🔒</span>
                <span><strong>100% 서버 무저장</strong> · 모든 연산은 사용자 기기 메모리에서만 안전하게 실행</span>
              </li>
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 hover:bg-amber-300 transition-colors">
                스튜디오 시작하기
              </Link>
              <Link href="/guide" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-300 hover:border-amber-400/40 hover:text-white transition-colors">
                📖 연동 & 사용 가이드 보기
              </Link>
            </div>
          </div>
          <div className="relative rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <div className="rounded-2xl bg-slate-950 p-5">
              <div className="mb-5 flex items-center justify-between text-sm">
                <span className="font-bold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  스튜디오 활성 렌더링 큐
                </span>
                <span className="text-emerald-300 font-semibold text-xs">초고속 인코딩 준비됨</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: "cinematic-intro-4k.mp4", size: "6.85 MB", time: "1.2초" },
                  { name: "motion-highlight-1080p.mov", size: "5.42 MB", time: "0.8초" },
                  { name: "product-360-loop.webm", size: "4.15 MB", time: "0.6초" }
                ].map((item, index) => (
                  <div key={item.name} className="rounded-xl border border-white/10 bg-slate-900 p-4">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-slate-200">{item.name}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">{item.time}</span>
                        <span className="font-bold text-amber-300">{item.size}</span>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: "100%" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs text-emerald-300 font-medium">
                ⚡ 내 PC 하드웨어 가속 연결 시 대용량 4K 영상도 끊김 없이 초고속 렌더링
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
