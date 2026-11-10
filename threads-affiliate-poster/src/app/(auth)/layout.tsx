// 2026-11-01 5단계 수직 레이아웃 표준 규격 (2안 95. 클린 스마트 커머스 인플루언서 아틀리에 스타일)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#F8FAFC",
        backgroundImage:
          "linear-gradient(to right, rgba(124, 58, 237, 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(124, 58, 237, 0.035) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #EDE9FE 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* 5단계 표준 레이아웃: 1단계 로고 + 2단계 알약 뱃지 + 3단계 타이틀 */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3.5 flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] text-3xl font-black text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] ring-4 ring-purple-500/20">
            @
          </div>
          <div className="mb-2.5 inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-purple-700">
            AIMASTER THREADS AFFILIATE
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-[26px]">
            쓰레드 쇼핑제휴 포스터
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
