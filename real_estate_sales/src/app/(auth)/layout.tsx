export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4">
      <div className="w-full max-w-sm">
        <h1 className="gold-text mb-8 text-center text-xl font-semibold">
          부동산 실거래 투자분석
        </h1>
        {children}
      </div>
    </div>
  );
}
