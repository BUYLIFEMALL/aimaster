"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";

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
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg mb-2 shadow-sm">
          N
        </div>
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">네이버 블로그 에이전트</h1>
        <p className="text-xs text-neutral-500 mt-1">AIMaster 통합 회원 계정으로 로그인하세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            이메일
          </label>
          <input
            type="email"
            name="email"
            placeholder="example@naver.com"
            required
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            비밀번호
          </label>
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            required
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-all disabled:opacity-50"
        >
          {isPending ? "로그인 중..." : "로그인"}
        </button>

        <div className="text-center pt-2">
          <a
            href={`${MAIN_SITE_URL}/signup`}
            className="text-xs text-neutral-500 hover:text-neutral-900 underline"
          >
            아직 계정이 없으신가요? AIMaster 회원가입
          </a>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center text-xs text-neutral-400">로딩 중...</div>}>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
