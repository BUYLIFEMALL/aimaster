import Link from "next/link";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="grid grid-cols-3 items-center">
          <nav className="flex items-center gap-3 text-sm justify-self-start">
            <a href={MAIN_SITE_URL} className="text-slate-300 hover:text-white">AIMaster 메인</a>
            <a href={`${MAIN_SITE_URL}/programs`} className="text-slate-300 hover:text-white">다른 프로그램</a>
          </nav>
          <Link href="/" className="justify-self-center text-lg font-black tracking-tight">Video<span className="text-amber-400">ToGIF</span></Link>
          <Link href="/dashboard" className="justify-self-end rounded-full border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">변환 시작</Link>
        </header>
        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">상세페이지·상품 GIF 자동화</p>
            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight sm:text-7xl">영상 하나를<br /><span className="text-amber-400">가벼운 GIF</span>로.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">영상 전체 길이는 유지하면서 고화질 팔레트 변환과 용량 최적화를 자동으로 처리합니다. 여러 파일도 한 번에 등록할 수 있습니다.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/dashboard" className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-slate-950 hover:bg-amber-300">무료로 변환해보기</Link><span className="rounded-xl border border-white/15 px-5 py-3 text-sm text-slate-300">최대 8MiB · 40/50fps</span></div>
          </div>
          <div className="relative rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <div className="rounded-2xl bg-slate-950 p-5"><div className="mb-5 flex items-center justify-between text-sm"><span className="font-bold">변환 작업</span><span className="text-emerald-300">3개 완료</span></div><div className="space-y-3">{["product-intro.mp4", "detail-motion.mov", "hero-shot.webm"].map((name, index) => <div key={name} className="rounded-xl border border-white/10 bg-slate-900 p-4"><div className="flex items-center justify-between"><span className="truncate text-sm text-slate-200">{name}</span><span className="text-xs text-amber-300">{["7.22 MB", "6.90 MB", "6.15 MB"][index]}</span></div><div className="mt-3 h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: "100%" }} /></div></div>)}</div></div>
          </div>
        </section>
      </div>
    </main>
  );
}
