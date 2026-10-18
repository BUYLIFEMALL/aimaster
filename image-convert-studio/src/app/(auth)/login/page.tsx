"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Images, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
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
    <div className="w-full max-w-md mx-auto">
      {/* 헤더 로고 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 text-white shadow-lg shadow-violet-500/25 mb-3">
          <Images className="w-7 h-7" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">{APP_NAME}</h1>
          <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-mono text-violet-400 border border-violet-500/20">
            {APP_VERSION}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          AIMaster 계정으로 로그인하여 이미지를 자유롭게 변환·편집하세요
        </p>
      </div>

      <div className="bg-[#111726] rounded-2xl border border-[#1e293b] p-7 sm:p-8 shadow-xl">
        {/* 탭 전환 */}
        <div className="mb-6 flex rounded-xl bg-[#0d121f] p-1 border border-[#1e293b]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs"
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
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3 text-center text-xs font-semibold text-rose-300">
            {error}
          </div>
        )}

        {mode === "signup" ? (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              이 프로그램은 AIMaster 통합 계정으로 구동됩니다.
              <br />
              AIMaster에서 무료 회원가입 후 즉시 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE_URL}/register`}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 text-xs font-bold text-white transition-all shadow-md shadow-violet-500/20"
            >
              <span>AIMaster 회원가입 하러가기</span>
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
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#1e293b] bg-[#0d121f] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
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
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#1e293b] bg-[#0d121f] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 text-xs font-bold text-white transition-all shadow-md shadow-violet-500/20 disabled:opacity-50 mt-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>로그인 확인 중...</span>
                </>
              ) : (
                <>
                  <span>로그인</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#1e293b] text-center">
          <a
            href={`${MAIN_SITE_URL}/login`}
            className="text-[11px] text-slate-400 hover:text-violet-300 transition-colors"
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
    <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </div>
  );
}
