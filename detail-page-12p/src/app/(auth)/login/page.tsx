"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { LayoutTemplate, Lock, Mail, ArrowRight } from "lucide-react";
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 mb-3">
          <LayoutTemplate className="w-7 h-7" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">{APP_NAME}</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            {APP_VERSION}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          AIMaster 계정으로 로그인하여 쿠팡·스마트스토어 12단 상세페이지를 원클릭으로 기획하고 렌더링하세요
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              이메일 주소
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                placeholder="example@buylife.xyz"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span>{isPending ? "로그인 중..." : "로그인"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <a
            href={`${MAIN_SITE_URL}/signup`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            회원가입
          </a>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            ← 메인 서비스 카탈로그
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-center text-sm text-slate-400">로딩 중...</div>}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
