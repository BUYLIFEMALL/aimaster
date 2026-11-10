"use client";

// 2026-11-01 주인님 절대 지시: 5단계 수직 레이아웃 표준 골격 & 1행 약관 축소 처리
// 91. 인스타 네온 선셋 크리에이터 스튜디오 스타일 (딥 스페이스 블랙 & 선셋 3D 엠보싱 버튼)
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
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("confirmed") === "1"
      ? "메일 인증이 끝났습니다. 가입한 이메일과 비밀번호로 로그인해 주세요."
      : null,
  );
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      if (mode === "signup" && IS_STANDALONE) {
        const result = await signUpAction({}, formData);
        if (result?.error) setError(result.error);
        if (result?.notice) {
          setNotice(result.notice);
          setMode("login");
        }
      } else {
        const result = await signInAction({}, formData);
        if (result?.error) setError(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#232E42] bg-[#131822] p-7 shadow-2xl shadow-pink-500/10 md:p-8">
      {/* 2단 탭 세그먼트 ([로그인] / [회원가입]) */}
      <div className="mb-6 flex rounded-xl border border-[#232E42] bg-[#0B0E14] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 ${
            mode === "login"
              ? "bg-gradient-to-r from-[#E1306C] via-[#FD1D1D] to-[#FCB045] text-white shadow-md shadow-pink-500/20"
              : "text-slate-400 hover:text-slate-100"
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
              ? "bg-gradient-to-r from-[#E1306C] via-[#FD1D1D] to-[#FCB045] text-white shadow-md shadow-pink-500/20"
              : "text-slate-400 hover:text-slate-100"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-300">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs font-semibold text-emerald-300">
          {notice}
        </div>
      )}

      {mode === "signup" && !IS_STANDALONE ? (
        <div className="space-y-4 text-center">
          <p className="text-sm leading-relaxed text-slate-300">
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="btn-3d flex w-full items-center justify-center py-3.5 text-sm font-extrabold text-white no-underline"
          >
            AIMaster 회원가입 하러가기 →
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />

          {/* 이메일 입력창 (Mail 아이콘) */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-slate-300">
              이메일 주소
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
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
                className="w-full rounded-xl border border-[#232E42] bg-[#0B0E14] py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-pink-500 focus:bg-[#0F1420] focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </div>

          {/* 비밀번호 입력창 (Lock 아이콘 & 비밀번호 찾기) */}
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
                className="text-xs font-semibold text-pink-400 hover:text-pink-300 hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
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
                className="w-full rounded-xl border border-[#232E42] bg-[#0B0E14] py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-pink-500 focus:bg-[#0F1420] focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </div>

          {/* 3D 엠보싱 선셋 실행 버튼 (`로그인 →`) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className={`btn-3d w-full py-3.5 text-sm font-extrabold text-white ${
                isPending ? "opacity-80" : ""
              }`}
            >
              {isPending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {mode === "signup" ? "가입하기" : "로그인"}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 5단계: [맨 아래] 약관 문구 1행 축소 처리 (2026-11-01 주인님 절대 지시 준수) */}
      {!IS_STANDALONE && (
        <p className="mt-7 text-center text-[10.5px] leading-5 tracking-wide text-slate-400 whitespace-nowrap">
          진행 시{" "}
          <a
            href={`${MAIN_SITE_URL}/terms`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-slate-200 underline underline-offset-2 hover:text-pink-400"
          >
            이용약관
          </a>{" "}
          및{" "}
          <a
            href={`${MAIN_SITE_URL}/privacy`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-slate-200 underline underline-offset-2 hover:text-pink-400"
          >
            개인정보 처리방침
          </a>
          에 동의하게 됩니다.
        </p>
      )}
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
