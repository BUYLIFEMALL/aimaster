"use client";

import { Suspense } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction, type AuthActionState } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";
const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
    >
      {pending ? "로그인 중..." : "로그인"}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const [state, formAction] = useFormState(signInAction, initialState);

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <div className="mb-8 text-center">
        <Link href="/" className="text-lg font-black tracking-tight text-white">
          Video<span className="text-amber-400">ToGIF</span>
        </Link>
        <p className="mt-3 text-sm text-slate-400">AIMaster 계정으로 로그인하면 이용할 수 있어요.</p>
      </div>

      <form action={formAction} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <input type="hidden" name="redirect" value={redirectTo} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">이메일</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">비밀번호</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-amber-400 underline">
          회원가입
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">
        <a href={MAIN_SITE_URL} className="underline hover:text-slate-300">
          AIMaster 메인으로 돌아가기
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
