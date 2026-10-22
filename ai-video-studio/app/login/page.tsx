"use client";

// 로그인 화면 — 공식 표준 레이아웃 (threads-comment-reply 공식 기준 동기화)
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
      const result = await signInAction({}, formData);
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
      <div className="mb-6 flex rounded-full bg-zinc-900 p-1 border border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-full py-2.5 text-center text-xs font-semibold transition-all duration-200 ${
            mode === "login" ? "bg-sky-500 text-zinc-950 font-bold shadow-md shadow-sky-500/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 rounded-full py-2.5 text-center text-xs font-semibold transition-all duration-200 ${
            mode === "signup" ? "bg-sky-500 text-zinc-950 font-bold shadow-md shadow-sky-500/20" : "text-zinc-400 hover:text-white"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-center text-xs font-medium text-red-400">
          {error}
        </div>
      )}

      {mode === "signup" ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-zinc-400 leading-relaxed">
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/signup`}
            className="block w-full rounded-full bg-sky-500 py-3 text-sm font-bold text-zinc-950 no-underline transition-all hover:bg-sky-400 shadow-md shadow-sky-500/20"
          >
            AIMaster 회원가입 하러가기
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-zinc-200">
              이메일 주소
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="developer@example.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-200">
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setError("비밀번호 재설정은 메인 사이트(buylife.xyz)에서 가능합니다.");
                }}
                className="text-xs font-semibold text-sky-400 hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-sky-500 py-3 text-sm font-bold text-zinc-950 transition-all hover:bg-sky-400 focus:outline-none shadow-md shadow-sky-500/20 ${
              isPending ? "cursor-not-allowed opacity-80" : ""
            }`}
          >
            {isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
            ) : (
              <>
                로그인
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      )}

      {/* Guide Link Shortcut */}
      <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
        <a
          href="/guide"
          className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium"
        >
          <span>📖 연동 & 사용 매뉴얼 가이드북 먼저 보기 →</span>
        </a>
      </div>

      <p className="mt-6 text-center text-[10.5px] leading-5 tracking-wide text-zinc-500">
        계속 진행함으로써 귀하는 당사의{" "}
        <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" className="font-medium text-zinc-400 hover:text-zinc-200 hover:underline">
          이용약관
        </a>{" "}
        및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="font-medium text-zinc-400 hover:text-zinc-200 hover:underline">
          개인정보 처리방침
        </a>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-xs text-zinc-500">화면 준비 중...</div>}>
      <LoginCard />
    </Suspense>
  );
}
