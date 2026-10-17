// 로그인·회원가입 화면 공통 틀 — 유튜브 다크 콘솔 스타일 (2026-10-17 v1.07 agy 리뉴얼)
// 퓨어 옵시디언 다크(#0f0f0f) 격자 모눈 배경 + 유튜브 레드 심볼 + 표준 안내 헤더 & 푸터.
import { APP_NAME, APP_VERSION } from "@/lib/version";

const MAIN_SITE_URL = "https://www.buylife.xyz";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#0f0f0f",
        backgroundImage:
          "linear-gradient(to right, rgba(255, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 0, 0, 0.04) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(255, 0, 0, 0.03) 0%, transparent 80%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* 상단 브랜딩 헤더 */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white shadow-xl shadow-red-600/20 ring-1 ring-white/10">
            {/* 유튜브 오리지널 플레이 버튼 심볼 */}
            <svg
              className="h-7 w-7 fill-current drop-shadow"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
              {APP_NAME}
            </h1>
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
              {APP_VERSION}
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium text-zinc-400">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>

        {/* 메인 폼 카드 */}
        {children}

        {/* 하단 푸터 링크 */}
        <div className="mt-6 text-center text-[11px] text-zinc-500">
          계속 진행함으로써 귀하는 당사의{" "}
          <a
            href={`${MAIN_SITE_URL}/terms`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
          >
            이용약관
          </a>
          과{" "}
          <a
            href={`${MAIN_SITE_URL}/privacy`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
          >
            개인정보 처리방침
          </a>
          에 동의하게 됩니다.
        </div>
      </div>
    </div>
  );
}
