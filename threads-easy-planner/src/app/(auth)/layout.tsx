export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#fafbfc",
        backgroundImage:
          "linear-gradient(to right, rgba(0, 90, 204, 0.028) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 90, 204, 0.028) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #f1f6fc 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-[#005acc]">
            Threads AI 기획기
          </h1>
          <p className="text-sm font-medium text-zinc-500">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
