"use client";

import Link from "next/link";
import { useState } from "react";
import { signInAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await signInAction(new FormData(e.currentTarget));
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-800">로그인</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">이메일</label>
          <input name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
        >
          {isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
          AIMaster에서 회원가입
        </Link>
      </p>
    </div>
  );
}
