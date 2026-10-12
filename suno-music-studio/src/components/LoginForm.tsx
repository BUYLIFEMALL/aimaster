"use client";

import { useActionState } from "react";

type State = { error?: string };

export function LoginForm({
  action,
}: {
  action: (state: State, form: FormData) => Promise<State>;
}) {
  const [state, submit, pending] = useActionState(action, {});

  return (
    <form action={submit} className="text-left space-y-4">
      <div>
        <label className="text-xs font-bold text-slate-700 m-0 mb-1.5 block">
          이메일
        </label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="buylife@example.com"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-700 m-0 mb-1.5 block">
          비밀번호
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
        />
      </div>
      {state.error && (
        <p role="alert" className="error text-xs p-3 rounded-xl m-0">
          {state.error}
        </p>
      )}
      <button
        className="primary full w-full mt-2 py-3 rounded-xl font-bold shadow-xs transition"
        disabled={pending}
      >
        {pending ? "로그인 확인 중…" : "로그인"}
      </button>
    </form>
  );
}
