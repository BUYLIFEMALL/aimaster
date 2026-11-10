import { BRAND_NAME, IS_STANDALONE } from "@/lib/deployment";

// 2026-11-01 주인님 절대 지시: 5단계 수직 레이아웃 표준 골격 준수
// 91. 인스타 네온 선셋 크리에이터 스튜디오 스타일 (딥 스페이스 블랙 & 네온 선셋 그라데이션)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-dark flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#0B0E14",
        backgroundImage:
          "linear-gradient(to right, rgba(225, 48, 108, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(225, 48, 108, 0.05) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #07090E 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* 1단계~3단계: 프로그램 고유 로고 -> 영문명 알약 뱃지 -> 볼드 한글명 타이틀 */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* 1. [맨 위] 프로그램 고유 로고 (64~68px 라운드 스퀘어 심볼 아이콘) */}
          <div className="mb-3.5 flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-3xl shadow-[0_10px_25px_rgba(225,48,108,0.35)] ring-4 ring-pink-500/20">
            📸
          </div>

          {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
          <div className="mb-2.5 inline-flex items-center rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-pink-400">
            AIMASTER INSTA POSTER
          </div>

          {/* 3. [그 밑] 프로그램 한글명 타이틀 & 서브 카피 */}
          <h1 className="text-2xl font-black tracking-tight text-white md:text-[26px]">
            INSTA 포스팅 자동화
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-400">
            {IS_STANDALONE
              ? `${BRAND_NAME ? `${BRAND_NAME} · ` : ""}이메일·비밀번호로 로그인하세요.`
              : "AIMaster 계정(이메일·비밀번호)으로 로그인하세요."}
          </p>
        </div>

        {/* 4단계: 로그인/회원가입 폼 카드 & 5단계: 1행 축소 약관 동의 */}
        {children}
      </div>
    </div>
  );
}
