"use client";

// 로그인 화면 — 모든 프로그램 같은 레이아웃(2026-10-01 주인님 지시, 기준: ai-auto-blog/app/auth/auth-form.tsx).
// 로그인 처리는 이 프로그램의 signInAction(lib/actions/auth.ts)을 그대로 쓴다(로그인 후 ?redirect 경로로 이동).
// 회원가입은 AIMaster에서만 받는다 — 탭에서 AIMaster 회원가입 페이지로 안내.
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = "https://www.buylife.xyz";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      // 성공하면 서버 함수가 redirect()로 이동시키고, 실패하면 { error }를 돌려준다.
      const result = await signInAction({}, formData);
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
      <div className="mb-6 flex rounded-xl bg-[#e8effd]/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-all duration-200 ${mode === "login" ? "bg-[#005acc] text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-all duration-200 ${mode === "signup" ? "bg-[#005acc] text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs font-medium text-red-600">{error}</div>
      )}

      {mode === "signup" ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-zinc-600">
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="block w-full rounded-xl bg-[#005acc] py-3 text-sm font-semibold text-white no-underline shadow-sm transition-all hover:bg-[#004bb9]"
          >
            AIMaster 회원가입 하러가기
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              이메일 주소
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="developer@example.com"
                className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 py-3 pl-10 pr-4 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-[#005acc] focus:outline-none focus:ring-1 focus:ring-[#005acc]/20"
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-700">
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setError("비밀번호 재설정 기능은 준비 중입니다.");
                }}
                className="text-xs font-semibold text-[#005acc] hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 py-3 pl-10 pr-4 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-[#005acc] focus:outline-none focus:ring-1 focus:ring-[#005acc]/20"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#005acc] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#004bb9] focus:outline-none ${isPending ? "cursor-not-allowed opacity-80" : ""}`}
          >
            {isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                로그인
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-[10.5px] leading-5 tracking-wide text-zinc-400">
        계속 진행함으로써 귀하는 당사의{" "}
        <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" className="font-medium text-zinc-600 hover:text-zinc-800 hover:underline">
          이용약관
        </a>{" "}
        및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="font-medium text-zinc-600 hover:text-zinc-800 hover:underline">
          개인정보 처리방침
        </a>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{
        backgroundColor: "#fafbfc",
        backgroundImage:
          "linear-gradient(to right, rgba(0, 90, 204, 0.028) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 90, 204, 0.028) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #f1f6fc 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}>
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-[#005acc]">캐릭코드(MBTI) 측정기</h1>
          <p className="text-sm font-medium text-zinc-500">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        <Suspense>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
