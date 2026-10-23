// 로그인·회원가입 화면 공식 표준 레이아웃 (DESIGN.md §5 및 threads-comment-reply 공식 기준)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-[#09090b] selection:bg-violet-500/30"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.12), transparent 55%), linear-gradient(to right, rgba(139, 92, 246, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 92, 246, 0.03) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 24px 24px, 24px 24px",
      }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 text-zinc-950 font-black text-2xl shadow-lg shadow-violet-500/20">
            🎨
          </div>
          <h1 className="mb-1 mt-4 text-3xl font-extrabold tracking-tight text-white">AI 음악 스튜디오</h1>
          <p className="text-sm font-medium text-zinc-400">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
