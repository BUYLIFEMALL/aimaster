"use client";

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
      const result = await signInAction(formData);
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#272732] bg-[#14141b] p-7 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-md">
      {/* 탭 버튼 */}
      <div className="mb-6 flex rounded-xl bg-[#1c1c28] p-1 border border-[#2b2b3b]">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 ${
            mode === "login"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25"
              : "text-zinc-400 hover:text-zinc-200"
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
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 ${
            mode === "signup"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-center text-xs font-medium text-rose-300">
          ⚠️ {error}
        </div>
      )}

      {mode === "signup" ? (
        <div className="space-y-4 text-center">
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            이 프로그램은 AIMaster 통합 계정과 사용 권한을 공유합니다.
            <br />
            AIMaster에서 회원가입 후 로그인하시면 즉시 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="block w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all text-center"
          >
            AIMaster 회원가입 바로가기 ↗
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-zinc-300">
              이메일 주소
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4">
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
                className="w-full rounded-xl border border-[#2b2b3b] bg-[#1c1c28] py-3 pl-10 pr-4 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 transition-all focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-bold text-zinc-300">
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setError("비밀번호 재설정 기능은 준비 중입니다.");
                }}
                className="text-xs font-semibold text-orange-400 hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4">
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
                className="w-full rounded-xl border border-[#2b2b3b] bg-[#1c1c28] py-3 pl-10 pr-4 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 transition-all focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-amber-600 focus:outline-none ${
              isPending ? "cursor-not-allowed opacity-80" : ""
            }`}
          >
            {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>로그인</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[10.5px] leading-relaxed text-zinc-500">
        계속 진행함으로써 귀하는 당사의{" "}
        <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-orange-400 hover:underline">
          이용약관
        </a>{" "}
        및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-orange-400 hover:underline">
          개인정보 처리방침
        </a>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}
