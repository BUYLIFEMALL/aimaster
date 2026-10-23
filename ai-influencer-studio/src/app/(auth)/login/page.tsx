"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Sparkles, Lock, Mail, ArrowRight } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

const MAIN_SITE_URL = "https://www.buylife.xyz";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white shadow-lg shadow-pink-500/20 mb-3">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold text-if-text">{APP_NAME}</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/40">
            {APP_VERSION}
          </span>
        </div>
        <p className="text-xs text-if-muted mt-1">
          AIMaster 계정으로 로그인하여 나만의 AI 인플루언서를 제작하세요
        </p>
      </div>

      <div className="bg-if-surface rounded-2xl border border-if-border p-8 shadow-sm">
        {error && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/40 p-3.5 text-xs text-rose-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />

          <div>
            <label className="block text-xs font-semibold text-if-text mb-1.5">
              이메일 주소
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-if-muted" />
              <input
                type="email"
                name="email"
                required
                placeholder="example@naver.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-if-border text-if-text text-xs focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-if-text mb-1.5">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-if-muted" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-if-border text-if-text text-xs focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-md shadow-pink-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{isPending ? "로그인 중..." : "로그인"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-if-border text-center text-xs text-if-muted">
          계정이 없으신가요?{" "}
          <a
            href={`${MAIN_SITE_URL}/signup`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-pink-400 hover:underline"
          >
            AIMaster 회원가입
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-if-raised flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-if-muted">로딩 중...</div>}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
