export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-xl font-semibold text-neutral-900">
          인스타그램 자동 포스팅 관리
        </h1>
        {children}
      </div>
    </div>
  );
}
