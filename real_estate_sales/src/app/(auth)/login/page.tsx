"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signInAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <div className="glass-card p-6">
      <h2 className="mb-4 text-lg font-medium text-neutral-100">로그인</h2>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">이메일</label>
          <Input name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">비밀번호</label>
          <Input name="password" type="password" required autoComplete="current-password" />
        </div>
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "로그인 중..." : "로그인"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-400">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-gold underline">
          AIMaster에서 회원가입
        </Link>
      </p>
    </div>
  );
}
