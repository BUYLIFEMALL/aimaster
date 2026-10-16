// 로그인·회원가입 화면 — 프로그램 전 화면과 같은 다크 슬레이트 배경(DESIGN.md 원칙 13).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#0f1115",
        backgroundImage:
          "linear-gradient(to right, rgba(147,197,253,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(147,197,253,0.05) 1px, transparent 1px), radial-gradient(circle at 50% 0%, rgba(37,99,235,0.18), transparent 60%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-mx-primary text-2xl">🛒</span>
          <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-mx-text">상품소싱 자동화</h1>
          <p className="text-sm font-medium text-mx-muted">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
