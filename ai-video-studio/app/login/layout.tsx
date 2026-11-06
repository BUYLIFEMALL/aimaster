// 로그인·회원가입 화면 공통 레이아웃 표준 규격 (2026-11-01 주인님 절대 지시)
// 1. [맨 위] 프로그램 고유 로고: 64~68px 라운드 스퀘어
// 2. [그 밑] 프로그램 영문명: 알약 캡슐 뱃지
// 3. [그 밑] 프로그램 한글명: 24~26px 볼드 타이틀 + 서브 카피
// 4. [중앙] 로그인/회원가입 폼 카드 + 3D 엠보싱 버튼
// 5. [맨 아래] 약관 문구 1행 축소 처리

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-[#0B0F19] selection:bg-red-500/30 text-slate-100"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(234, 51, 35, 0.15), transparent 55%), linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 28px 28px, 28px 28px",
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* 1~3단계: 5단계 수직 레이아웃 표준 상단 헤더 */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* 1. 고유 로고 (64px 쇼츠 레드 라운드 스퀘어) */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 border border-red-400/40 shadow-xl shadow-red-600/30 flex items-center justify-center text-white text-3xl mb-3 transform hover:scale-105 transition-transform">
            🎬
          </div>
          {/* 2. 프로그램 영문명 알약 뱃지 */}
          <span className="px-4 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30 shadow-sm mb-2">
            AIMASTER AI VIDEO STUDIO
          </span>
          {/* 3. 프로그램 한글명 & 안내 카피 */}
          <h1 className="text-2xl font-black text-white tracking-tight">AI 영상 스튜디오</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>

        {/* 4~5단계: 카드 및 폼 & 1행 약관 */}
        {children}
      </div>
    </div>
  );
}
