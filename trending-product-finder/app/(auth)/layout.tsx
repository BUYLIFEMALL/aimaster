// 70. 퀀트 이커머스 인텔리전스 레이더 덱 스타일 로그인 레이아웃
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#070B14",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.12) 0%, transparent 60%), linear-gradient(to right, rgba(30, 41, 59, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.4) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 32px 32px, 32px 32px",
      }}
    >
      <div className="w-full max-w-[440px]">
        {children}
      </div>
    </div>
  );
}
