
// 로그인·회원가입 화면 — 프로그램 전 화면과 같은 다크 스튜디오 배경(INSTA 댓글·DM과 같은 팔레트)(DESIGN.md 원칙 13, v1.24).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0d0f17", backgroundImage: "radial-gradient(circle at 50% 0%, rgba(236,72,153,0.14), transparent 55%)" }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-2xl">📥</span>
          <h1 className="mb-1 mt-4 text-3xl font-extrabold tracking-tight text-ig-text">AI 댓글·DM 통합 받은편지함</h1>
          <p className="text-sm font-medium text-ig-muted">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
