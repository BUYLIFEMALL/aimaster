import { BrandMark } from "@/components/ui/BrandMark";

// 2026-11-01 5단계 수직 레이아웃 표준 규격 AuthLayout
// [1] 맨 위 프로그램 고유 로고 -> [2] 영문명 알약 캡슐 뱃지 -> [3] 한글명 볼드 타이틀 + 서브 카피
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#0B0F17",
        backgroundImage:
          "linear-gradient(to right, rgba(245, 158, 11, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(245, 158, 11, 0.05) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #06090e 95%)",
        backgroundSize: "32px 32px, 32px 32px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* 1. [맨 위] 프로그램 고유 로고 (64px) */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/40 p-2 shadow-xl shadow-amber-500/10">
            <BrandMark size={48} />
          </div>

          {/* 2. [그 밑] 프로그램 영문명 알약 캡슐 뱃지 */}
          <div className="mt-4">
            <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400">
              AIMASTER COMMERCIAL LAND RADAR
            </span>
          </div>

          {/* 3. [그 밑] 프로그램 한글명 볼드 메인 타이틀 + 서브 안내 카피 */}
          <h1 className="mb-1.5 mt-2.5 text-2xl font-black tracking-tight text-white">
            상업용지·토지 실거래가 레이더
          </h1>
          <p className="text-xs font-medium text-gray-400">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>

        {/* 4. [중앙] 로그인/회원가입 카드 폼 (children) */}
        {children}
      </div>
    </div>
  );
}
