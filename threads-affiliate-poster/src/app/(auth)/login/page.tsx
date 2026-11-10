"use client";

// 로그인 화면 — 2026-11-01 5단계 표준 규격 + 2안(95. 인플루언서 아틀리에 로열 퍼플) 적용.
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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_12px_32px_rgba(124,58,237,0.08)]">
      {/* 2단 탭 세그먼트 */}
      <div className="mb-6 flex rounded-xl bg-purple-50/70 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 ${
            mode === "login"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
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
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      {mode === "signup" ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-600 leading-relaxed">
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="btn-3d btn-3d-royal-purple block w-full py-3.5 text-sm font-bold text-white no-underline text-center"
          >
            AIMaster 회원가입 하러가기 →
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-slate-700">
              이메일 주소
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-bold text-slate-700">
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setError("비밀번호 재설정 기능은 준비 중입니다.");
                }}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20"
              />
            </div>
          </div>

          {/* 3D 엠보싱 로열 퍼플 버튼 */}
          <button
            type="submit"
            disabled={isPending}
            className={`btn-3d btn-3d-royal-purple flex w-full cursor-pointer items-center justify-center gap-2 py-3.5 text-sm font-bold text-white shadow-sm ${
              isPending ? "cursor-not-allowed opacity-80" : ""
            }`}
          >
            {isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

      {/* 5단계 약관 1행 축소 처리 표준 규격 */}
      <p className="mt-8 text-center text-xs tracking-tight text-slate-400 whitespace-nowrap">
        진행 시{" "}
        <a
          href={`${MAIN_SITE_URL}/terms`}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-purple-600 hover:text-purple-700 hover:underline"
        >
          이용약관
        </a>{" "}
        및{" "}
        <a
          href={`${MAIN_SITE_URL}/privacy`}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-purple-600 hover:text-purple-700 hover:underline"
        >
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
