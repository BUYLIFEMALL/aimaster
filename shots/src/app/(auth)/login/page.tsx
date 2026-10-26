"use client";

// 로그인 화면 (헐리우드 시네마틱 네온 REC 테마 일치화)
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
    <div className="rounded-2xl border border-[#202945] bg-[#13182c] p-7 md:p-8 shadow-2xl shadow-black/60">
      {/* 탭 토글 바 */}
      <div className="mb-6 flex rounded-xl bg-[#0f1325] border border-[#202945] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 ${
            mode === "login" 
              ? "btn-3d-rec shadow-md" 
              : "text-slate-400 hover:text-white"
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
              ? "btn-3d-rec shadow-md" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-center text-xs font-bold text-rose-300">
          {error}
        </div>
      )}

      {mode === "signup" ? (
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-300 leading-relaxed">
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="btn-3d-amber block w-full py-3 text-xs font-black no-underline"
          >
            AIMaster 회원가입 하러가기
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-slate-300">
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
                className="w-full rounded-xl border border-[#202945] bg-[#0f1325] py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 transition-all focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-bold text-slate-300">
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setError("비밀번호 재설정 기능은 준비 중입니다.");
                }}
                className="text-xs font-semibold text-rose-400 hover:underline"
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
                className="w-full rounded-xl border border-[#202945] bg-[#0f1325] py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 transition-all focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={`btn-3d-rec flex w-full py-3 text-xs font-black shadow-lg ${isPending ? "cursor-not-allowed opacity-80" : ""}`}
          >
            {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>스튜디오 로그인</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-[10.5px] leading-5 tracking-wide text-slate-500">
        계속 진행함으로써 귀하는 당사의{" "}
        <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" className="font-medium text-slate-400 hover:text-white hover:underline">
          이용약관
        </a>{" "}
        및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="font-medium text-slate-400 hover:text-white hover:underline">
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
