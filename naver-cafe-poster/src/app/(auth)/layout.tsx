// 로그인·회원가입 화면 공통 틀 — 모든 프로그램 같은 레이아웃(2026-10-01 주인님 지시, 기준: ai-auto-blog/app/auth).
// 격자 배경 + 파란 프로그램 이름 + 안내 문구. 카드(로그인 폼)는 각 페이지가 그린다.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{
        backgroundColor: "#fafbfc",
        backgroundImage:
          "linear-gradient(to right, rgba(0, 90, 204, 0.028) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 90, 204, 0.028) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #f1f6fc 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}>
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-[#005acc]">네이버 카페 포스팅 자동화</h1>
          <p className="text-sm font-medium text-zinc-500">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
