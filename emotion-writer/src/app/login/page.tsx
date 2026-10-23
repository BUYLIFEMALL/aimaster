"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Heart, Lock, Mail, ArrowRight } from "lucide-react";
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-md shadow-rose-200/50 mb-3">
          <Heart className="w-7 h-7 fill-white/40 text-rose-100" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">{APP_NAME}</h1>
        <p className="text-xs text-stone-600 mt-1">
          AIMaster 계정으로 로그인하여 나만의 감성 캘리그라피 카드를 제작하세요
        </p>
      </div>

      <div className="rounded-2xl border border-[#e7e0d3] bg-white p-8 shadow-sm">
        {/* 탭 전환 */}
        <div className="mb-6 flex rounded-xl border border-[#ded6c8] bg-[#fcfaf5] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
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
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {mode === "signup" ? (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-stone-600 leading-relaxed">
              이 프로그램은 AIMaster 통합 계정으로 구동됩니다.
              <br />
              AIMaster에서 무료 회원가입 후 즉시 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE_URL}/register`}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-rose-600 hover:bg-rose-700 py-3 text-xs font-bold text-white transition-all shadow-xs"
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
                className="mb-1.5 block text-xs font-semibold text-stone-700"
              >
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#ded6c8] bg-[#fdfbf7] py-2.5 pl-10 pr-3.5 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold text-stone-700"
              >
                비밀번호
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#ded6c8] bg-[#fdfbf7] py-2.5 pl-10 pr-3.5 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-105 py-3 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50 mt-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>로그인 확인 중...</span>
                </>
              ) : (
                <>
                  <Heart className="w-3.5 h-3.5 fill-white/40" />
                  <span>스튜디오 입장하기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#f0e9dc] text-center">
          <a
            href={`${MAIN_SITE_URL}/login`}
            className="text-[11px] text-stone-500 hover:text-rose-600 transition-colors"
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
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </div>
  );
}
