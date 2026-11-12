"use client";

// 2026-11-01 5단계 로그인/회원가입 표준 규격 (4. 중앙 카드 + 5. 맨 아래 1행 약관)
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
    <div className="rounded-2xl border border-[#1E293B] bg-[#121824] p-8 shadow-2xl backdrop-blur-md">
      {/* 2단 세그먼트 탭 */}
      <div className="mb-6 flex rounded-xl bg-[#0B0F17] p-1 border border-[#1E293B]">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
            mode === "login"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-black"
              : "text-gray-400 hover:text-gray-200"
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
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
            mode === "signup"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-black"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-center text-xs font-bold text-rose-400">
          ⚠️ {error}
        </div>
      )}

      {mode === "signup" ? (
        <div className="space-y-4 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="flex w-full min-h-[46px] items-center justify-center rounded-xl btn-3d-gold text-sm font-black text-black no-underline"
          >
            AIMaster 회원가입 하러가기 →
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-gray-300">
              이메일 주소
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="developer@example.com"
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F17] py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 transition-all focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-bold text-gray-300">
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setError("비밀번호 재설정 기능은 준비 중입니다.");
                }}
                className="text-xs font-bold text-amber-400 hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#1E293B] bg-[#0B0F17] py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 transition-all focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={`flex w-full min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl btn-3d-gold text-sm font-black text-black transition-all ${
              isPending ? "cursor-not-allowed opacity-80" : ""
            }`}
          >
            {isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              <>
                로그인 <span className="font-mono">→</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* 5. [맨 아래] 약관 문구 1행 축소 처리 (2026-11-01 주인님 절대 지시) */}
      <p className="mt-6 text-center text-xs whitespace-nowrap text-gray-500">
        진행 시{" "}
        <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" className="text-amber-400/80 hover:text-amber-300 underline font-medium">
          이용약관
        </a>{" "}
        및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="text-amber-400/80 hover:text-amber-300 underline font-medium">
          개인정보 처리방침
        </a>
        에 동의합니다.
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
