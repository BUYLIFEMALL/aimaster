"use client";

import { Suspense } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction, type AuthActionState } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";
const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-4 py-3 rounded-2xl bg-neutral-900 text-white font-bold text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50"
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
    <div className="max-w-sm mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🔮</div>
        <h1 className="text-xl font-black text-neutral-900">AIMaster 타로점</h1>
        <p className="text-sm text-neutral-400 mt-2">AIMaster 계정으로 로그인하면 이용할 수 있어요.</p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">이메일</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">비밀번호</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-neutral-900 underline">
          회원가입
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-neutral-400">
        <a href={MAIN_SITE_URL} className="underline hover:text-neutral-600">
          buylife.xyz로 돌아가기
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
