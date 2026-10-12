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
    <form action={submit}>
      <label>
        이메일
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        비밀번호
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      <button className="primary full" disabled={pending}>
        {pending ? "로그인 확인 중…" : "로그인"}
      </button>
    </form>
  );
}
