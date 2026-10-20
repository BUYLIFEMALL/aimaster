"use client";

// 로그인 화면 — 모든 프로그램 같은 레이아웃(2026-10-01 주인님 지시, 기준: ai-auto-blog/app/auth/auth-form.tsx).
// 로그인 처리는 이 프로그램의 signInAction(lib/actions/auth.ts)을 그대로 쓴다(로그인 후 ?redirect 경로로 이동).
// 회원가입은 AIMaster에서만 받는다 — 탭에서 AIMaster 회원가입 페이지로 안내.
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction, signUpAction } from "@/lib/actions/auth";
import { IS_STANDALONE } from "@/lib/deployment";

const MAIN_SITE_URL = "https://www.buylife.xyz";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  // 가입 확인 메일 링크를 다른 브라우저에서 연 경우(/api/auth/confirm → ?confirmed=1): 인증은 끝났으니 로그인 안내
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("confirmed") === "1" ? "메일 인증이 끝났습니다. 가입한 이메일과 비밀번호로 로그인해 주세요." : null,
  );
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      // 성공하면 서버 함수가 redirect()로 이동시키고, 실패하면 { error }를 돌려준다.
      // 독립 운영 모드(2026-10-18)의 회원가입 탭은 signUpAction, 그 밖에는 로그인
      if (mode === "signup" && IS_STANDALONE) {
        const result = await signUpAction({}, formData);
        if (result?.error) setError(result.error);
        if (result?.notice) { setNotice(result.notice); setMode("login"); }
      } else {
        const result = await signInAction({}, formData);
        if (result?.error) setError(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-8 shadow-2xl shadow-pink-500/5">
      <div className="mb-6 flex rounded-xl bg-[#0d0f17] border border-[#262c3d] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-all duration-200 ${mode === "login" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-100"}`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-all duration-200 ${mode === "signup" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-100"}`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-medium text-red-300">{error}</div>
      )}

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs font-medium text-emerald-300">{notice}</div>
      )}

      {mode === "signup" && !IS_STANDALONE ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-300">
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="block w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-semibold text-white no-underline shadow-sm transition-all hover:opacity-90"
          >
            AIMaster 회원가입 하러가기
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-slate-300">
              이메일 주소
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="developer@example.com"
                className="w-full rounded-xl border border-[#262c3d] bg-[#0d0f17] py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20"
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-semibold text-slate-300">
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setError("비밀번호 재설정 기능은 준비 중입니다.");
                }}
                className="text-xs font-semibold text-pink-400 hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#262c3d] bg-[#0d0f17] py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/20"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 focus:outline-none ${isPending ? "cursor-not-allowed opacity-80" : ""}`}
          >
            {isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                {mode === "signup" ? "가입하기" : "로그인"}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </>
            )}
          </button>
        </form>
      )}

      {!IS_STANDALONE && <p className="mt-8 text-center text-[10.5px] leading-5 tracking-wide text-slate-500">
        계속 진행함으로써 귀하는 당사의{" "}
        <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" className="font-medium text-slate-300 hover:text-slate-100 hover:underline">
          이용약관
        </a>{" "}
        및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="font-medium text-slate-300 hover:text-slate-100 hover:underline">
          개인정보 처리방침
        </a>
        에 동의하게 됩니다.
      </p>}
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
