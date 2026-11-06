"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Clapperboard, Lock, Mail, ArrowRight, Film } from "lucide-react";
import { APP_NAME } from "@/lib/version";

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
    <div className="w-full max-w-[440px] mx-auto text-center">
      {/* 1. [맨 위] 프로그램 고유 로고 (64px 라운드 스퀘어 심볼) */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.35)] border border-rose-400/30 mb-3">
        <Clapperboard className="w-8 h-8 text-white" />
      </div>

      {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
      <div className="mb-2">
        <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
          AIMASTER MUSIC VIDEO STUDIO
        </span>
      </div>

      {/* 3. [그 밑] 프로그램 한글명 타이틀 */}
      <h1 className="text-2xl font-black text-white tracking-tight mb-1">
        AI 뮤직비디오 자동화
      </h1>
      <p className="text-xs text-slate-400 mb-6">
        AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
      </p>

      {/* 4. [중앙] 로그인/회원가입 카드 폼 */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1020]/95 p-6 md:p-8 shadow-2xl backdrop-blur-md text-left">
        {/* 2단 세그먼트 탭 */}
        <div className="mb-5 flex rounded-xl border border-slate-800 bg-slate-950/80 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black"
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
            className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
              mode === "signup"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black"
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
              className="btn-3d-magenta inline-flex items-center justify-center gap-1.5 w-full rounded-xl py-3 text-xs font-black text-white"
            >
              <span>AIMaster 통합 회원가입 하러가기</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-bold text-slate-300">
                  비밀번호
                </label>
                <a
                  href={`${MAIN_SITE_URL}/forgot-password`}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
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
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* 3D 엠보싱 마젠타 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-3d-magenta w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black text-white mt-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>로그인 인증 중...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>스튜디오 콘솔 입장 →</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-5 pt-3 border-t border-slate-800 text-center">
          <a
            href={`${MAIN_SITE_URL}/login`}
            className="text-[11px] text-slate-400 hover:text-rose-300 transition-colors"
          >
            AIMaster 메인 사이트에서 로그인하기 &rarr;
          </a>
        </div>
      </div>

      {/* 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 준수 지침) */}
      <p className="mt-6 text-[11px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
        진행 시{" "}
        <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
          이용약관
        </a>
        {" 및 "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
          개인정보 처리방침
        </a>
        에 동의합니다.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070a14] flex items-center justify-center p-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </div>
  );
}
