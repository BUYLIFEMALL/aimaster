export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4">
      <div className="w-full max-w-sm">
        <h1 className="gold-text mb-8 text-center text-xl font-semibold">
          부동산 실시간 매매정보
        </h1>
        {children}
      </div>
    </div>
  );
}
