// 2026-11-01 주인님 절대 지시: 5단계 수직 레이아웃 표준 골격 & 프로그램별 스타일 자율성 준수
// 89. 네이버 부동산 스마트 매트릭스 저널 스타일 (소프트 화이트 #F8FAFC & 네이버 그린 #03C75A)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage:
          "linear-gradient(to right, rgba(3, 199, 90, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(3, 199, 90, 0.06) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #f1f5f9 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* 1단계~3단계: 프로그램 고유 로고 -> 영문명 알약 뱃지 -> 볼드 한글명 타이틀 */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* 1. [맨 위] 프로그램 고유 로고 (64~68px 라운드 스퀘어 심볼 아이콘) */}
          <div className="mb-3.5 flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#03C75A] to-[#009B42] text-3xl shadow-[0_8px_20px_rgba(3,199,90,0.3)] ring-4 ring-[#03C75A]/15">
            🏢
          </div>

          {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
          <div className="mb-2.5 inline-flex items-center rounded-full border border-[#03C75A]/30 bg-[#03C75A]/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#03C75A]">
            AIMASTER REAL ESTATE SALES
          </div>

          {/* 3. [그 밑] 프로그램 한글명 타이틀 & 서브 카피 */}
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-[26px]">
            부동산 실거래 투자분석 자동화
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>

        {/* 4단계: 로그인/회원가입 폼 카드 & 5단계: 1행 축소 약관 동의 */}
        {children}
      </div>
    </div>
  );
}
