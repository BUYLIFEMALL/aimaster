// 음악(SUNO)자동화 로그인/회원가입 레이아웃 — Suno 사이버 다크 스튜디오 스타일
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-[#09090b] text-zinc-100 selection:bg-orange-500 selection:text-white"
    >
      {/* Background ambient neon glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center h-8 px-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm tracking-wider shadow-lg shadow-orange-500/30">
              SUNO
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">음악 자동화</h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-zinc-400">
            AIMaster 통합 계정으로 로그인하여 AI 음악 제작을 시작하세요.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
