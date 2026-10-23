"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Disc3, Lock, Mail, ArrowRight, Music2 } from "lucide-react";
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
    <div className="w-full max-w-md mx-auto">
      {/* 헤더 로고 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-cyan-400 text-white shadow-[0_0_24px_rgba(244,63,94,0.4)] mb-3">
          <Disc3 className="w-8 h-8 animate-[spin_6s_linear_infinite]" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">{APP_NAME}</h1>
        <p className="text-xs text-slate-400 mt-1">
          AIMaster 계정으로 로그인하여 AI 음악과 시네마틱 뮤직비디오를 자동 제작하세요
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-[#0a0f1d] via-[#080d19] to-[#050811] p-8 shadow-2xl backdrop-blur-md">
        {/* 탭 전환 */}
        <div className="mb-6 flex rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]"
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
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
              mode === "signup"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]"
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
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 py-3 text-xs font-bold text-white transition-all shadow-[0_0_16px_rgba(244,63,94,0.3)]"
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
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-950/80 py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                비밀번호
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-950/80 py-2.5 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:brightness-110 py-3 text-xs font-bold text-white transition-all shadow-[0_0_18px_rgba(244,63,94,0.35)] disabled:opacity-50 mt-2"
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

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <a
            href={`${MAIN_SITE_URL}/login`}
            className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
          >
            AIMaster 메인 사이트에서 로그인하기 &rarr;
          </a>
        </div>
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
