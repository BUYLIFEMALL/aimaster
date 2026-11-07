"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Disc3, Lock, Mail, ArrowRight, Music2 } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

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
    } catch (err: any) {
      if (!err?.message?.includes("NEXT_REDIRECT")) {
        setError(err.message || "로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] mx-auto flex flex-col items-center">
      {/* 1. [맨 위] 프로그램 고유 로고 (64px 에메랄드 사운드 로고) */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_24px_rgba(16,185,129,0.4)] mb-3">
        <Disc3 className="w-9 h-9 animate-[spin_6s_linear_infinite]" />
      </div>

      {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
      <div className="px-4 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-950/60 border border-emerald-500/35 text-emerald-400 mb-2.5">
        • AIMASTER FREE MUSIC OPS
      </div>

      {/* 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 */}
      <h1 className="text-2xl font-black text-slate-100 tracking-tight text-center flex items-center justify-center gap-2">
        <span>{APP_NAME}</span>
        <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
          {APP_VERSION}
        </span>
      </h1>
      <p className="text-xs text-slate-400 mt-1 mb-6 text-center">
        AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
      </p>

      {/* 4. [중앙] 로그인/회원가입 폼 카드 */}
      <div className="w-full rounded-2xl border border-emerald-500/25 bg-[#0C101D] p-6 sm:p-7 shadow-2xl backdrop-blur-md">
        {/* 2단 탭 세그먼트 */}
        <div className="mb-5 flex rounded-xl border border-slate-800 bg-[#060911] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-black transition-all ${
              mode === "login"
                ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200"
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
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-black transition-all ${
              mode === "signup"
                ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-center text-xs font-semibold text-rose-300">
            {error}
          </div>
        )}

        {mode === "signup" ? (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              이 프로그램은 AIMaster 통합 계정으로 구동됩니다.
              <br />
              AIMaster에서 무료 회원가입 후 즉시 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE_URL}/register`}
              className="btn-3d-emerald inline-flex items-center justify-center gap-1.5 w-full rounded-xl py-3 text-xs font-black text-white cursor-pointer"
            >
              <span>AIMaster 통합 회원가입 하러가기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-700/60 bg-[#060911] py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  비밀번호
                </label>
                <a
                  href={`${MAIN_SITE_URL}/forgot-password`}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  비밀번호 찾기?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700/60 bg-[#060911] py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                />
              </div>
            </div>

            {/* 3D 엠보싱 에메랄드 실행 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-3d-emerald w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-black cursor-pointer disabled:opacity-50 mt-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>로그인 인증 중...</span>
                </>
              ) : (
                <>
                  <Music2 className="w-3.5 h-3.5" />
                  <span>스튜디오 콘솔 입장</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 규격) */}
      <div className="mt-4 text-center text-[11px] text-slate-400 whitespace-nowrap">
        진행 시{" "}
        <a href={`${MAIN_SITE_URL}/terms`} className="underline hover:text-emerald-300">
          이용약관
        </a>{" "}
        및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} className="underline hover:text-emerald-300">
          개인정보 처리방침
        </a>
        에 동의합니다.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#060911] flex items-center justify-center p-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </div>
  );
}
