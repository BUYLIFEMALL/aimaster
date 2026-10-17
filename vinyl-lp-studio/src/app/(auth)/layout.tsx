// 로그인·회원가입 화면 공통 틀 — 크리에이티브 아틀리에 (바이닐 다크 레트로 콘솔 스타일) (2026-10-17 v1.08 agy 리뉴얼)
// 딥 옵시디언 나이트(#0c0d12) 격자 모눈 배경 + 바이닐 골드/앰버 심볼 + 표준 안내 헤더 & 푸터.
import { APP_NAME, APP_VERSION } from "@/lib/version";

const MAIN_SITE_URL = "https://www.buylife.xyz";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#0c0d12",
        backgroundImage:
          "linear-gradient(to right, rgba(245, 158, 11, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(245, 158, 11, 0.04) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.04) 0%, transparent 80%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* 상단 브랜딩 헤더 */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-600 to-rose-600 text-white shadow-xl shadow-amber-600/20 ring-1 ring-white/10">
            {/* 바이닐 턴테이블 레코드 심볼 */}
            <svg
              className="h-7 w-7 text-white drop-shadow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M12 2a10 10 0 0 0-4 19.19" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
              {APP_NAME}
            </h1>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
              {APP_VERSION}
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium text-slate-400">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>

        {/* 메인 폼 카드 */}
        {children}

        {/* 하단 푸터 링크 */}
        <div className="mt-6 text-center text-[11px] text-slate-500">
          계속 진행함으로써 귀하는 당사의{" "}
          <a
            href={`${MAIN_SITE_URL}/terms`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-400 underline underline-offset-2 hover:text-slate-200"
          >
            이용약관
          </a>
          과{" "}
          <a
            href={`${MAIN_SITE_URL}/privacy`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-400 underline underline-offset-2 hover:text-slate-200"
          >
            개인정보 처리방침
          </a>
          에 동의하게 됩니다.
        </div>
      </div>
    </div>
  );
}
