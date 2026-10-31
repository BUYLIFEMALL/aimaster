"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

function LoginCard() {
  const redirectTo = useSearchParams().get("redirect") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signInAction({}, new FormData(event.currentTarget));
      if (result?.error) setError(result.error);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("NEXT_REDIRECT")) setError(message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-3xl shadow">📦</div>
        <h1 className="text-xl font-extrabold text-slate-900">{APP_NAME}</h1>
        <p className="mt-1 text-xs text-slate-600">{APP_VERSION} · AIMaster 계정으로 로그인하세요</p>
      </div>
      <div className="slw-card p-7">
        {error && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-bold text-rose-700">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="slw-label">이메일 주소</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="slw-field" placeholder="name@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="slw-label">비밀번호</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="slw-field" />
          </div>
          <button type="submit" disabled={pending} className="slw-primary w-full">{pending ? "로그인 확인 중…" : "로그인"}</button>
        </form>
        <div className="mt-5 flex justify-between border-t border-slate-200 pt-4 text-[12px]">
          <a className="text-slate-600 hover:text-blue-800" href={`${MAIN_SITE}/register`}>AIMaster 회원가입</a>
          <a className="text-slate-600 hover:text-blue-800" href={`${MAIN_SITE}/login`}>메인 사이트에서 로그인 →</a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </div>
  );
}
