"use client";

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
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
      <div className="mb-6 flex rounded-xl bg-[#e8effd]/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-all duration-200 ${
            mode === "login"
              ? "bg-[#005acc] text-white shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
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
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-all duration-200 ${
            mode === "signup"
              ? "bg-[#005acc] text-white shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs font-medium text-red-600">
          {error}
        </div>
      )}

      {mode === "signup" ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-zinc-600 leading-relaxed">
            이 프로그램은 AIMaster 통합 계정으로 로그인합니다.
            <br />
            AIMaster에서 회원가입 후 바로 이용하실 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="block w-full rounded-xl bg-[#005acc] py-3 text-sm font-semibold text-white no-underline shadow-sm transition-all hover:bg-[#004bb9]"
          >
            AIMaster 회원가입 하러가기
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              이메일 주소
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 py-3 px-4 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-[#005acc] focus:outline-none focus:ring-1 focus:ring-[#005acc]/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 py-3 px-4 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-[#005acc] focus:outline-none focus:ring-1 focus:ring-[#005acc]/20"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-[#005acc] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#004bb9] active:scale-[0.99] disabled:opacity-50"
          >
            {isPending ? "로그인 중..." : "로그인 →"}
          </button>
        </form>
      )}

      <div className="mt-8 border-t border-zinc-100 pt-5 text-center text-[11px] text-zinc-400">
        계정 관련 문의 및 이용안내:{" "}
        <a href={MAIN_SITE_URL} className="text-zinc-600 underline hover:text-zinc-900">
          AIMaster 홈
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-zinc-500 py-12">로딩 중...</div>}>
      <LoginCard />
    </Suspense>
  );
}
