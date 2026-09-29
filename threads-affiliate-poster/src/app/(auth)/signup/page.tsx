"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signUpAction, type SignUpActionState } from "@/lib/actions/auth";
import { IS_STANDALONE, MAIN_SITE_URL } from "@/lib/deployment";

const initialState: SignUpActionState = {};

// 회원가입은 AIMaster에서만 받는다 — 모든 AI 프로그램은 AIMaster 계정/구독 권한을 공유한다.
function AimasterSignupNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
      <h2 className="mb-2 text-lg font-medium text-neutral-900">회원가입은 AIMaster에서 진행됩니다</h2>
      <p className="mb-6 text-sm text-neutral-500">
        이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
        <br />
        AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
      </p>
      <a
        href={`${MAIN_SITE_URL}/register`}
        className="inline-block w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        AIMaster 회원가입 하러가기
      </a>
      <p className="mt-4 text-center text-sm text-neutral-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

// Standalone copies (clone-kit) take their own sign-ups.
function StandaloneSignupForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-medium text-neutral-900">회원가입</h2>
      {state.message ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">이름</label>
            <Input name="name" autoComplete="name" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">이메일</label>
            <Input name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">비밀번호 (8자 이상)</label>
            <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <label className="flex items-start gap-2 text-xs text-neutral-600">
            <input type="checkbox" name="agree" className="mt-0.5" />
            <span>
              <Link href="/legal/terms" target="_blank" className="underline">이용약관</Link>과{" "}
              <Link href="/legal/privacy" target="_blank" className="underline">개인정보처리방침</Link>에 동의합니다.
            </span>
          </label>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "가입 중..." : "회원가입"}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-neutral-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return IS_STANDALONE ? <StandaloneSignupForm /> : <AimasterSignupNotice />;
}
