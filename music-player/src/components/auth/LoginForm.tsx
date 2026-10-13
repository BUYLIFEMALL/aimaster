"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (error) { setError("이메일 또는 비밀번호를 확인해 주세요."); return; }
      window.location.assign("/player");
    } catch { setError("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { setPending(false); }
  }
  return <form onSubmit={login} className="stack"><label>이메일<input name="email" type="email" autoComplete="username" required/></label><label>비밀번호<input name="password" type="password" autoComplete="current-password" required/></label>{error && <p role="alert" className="error">{error}</p>}<button className="button primary" disabled={pending}>{pending ? "로그인 중…" : "로그인"}</button></form>;
}
