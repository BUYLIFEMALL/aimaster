"use client";
// v1.21 공식 로그인 탭 레이아웃(DESIGN.md 원칙 14, 기준 threads-comment-reply) — 로그인 처리는 예전과 같은 Supabase 이메일·비밀번호
import { useState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAIN_SITE } from "@/lib/version";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (error) { setError("이메일 또는 비밀번호를 확인해 주세요."); return; }
      window.location.assign("/open");
    } catch { setError("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { setPending(false); }
  }
  return (
    <div className="card auth-card">
      <div className="auth-tabs" role="tablist" aria-label="로그인 또는 회원가입">
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>로그인</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>회원가입</button>
      </div>
      {error && <p role="alert" className="auth-error">{error}</p>}
      {mode === "signup" ? (
        <div className="auth-signup">
          <p>이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.<br />AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.</p>
          <a className="button primary auth-submit" href={`${MAIN_SITE}/register`}>AIMaster 회원가입 하러가기</a>
        </div>
      ) : (
        <form onSubmit={login} className="auth-form">
          <label htmlFor="email">이메일 주소</label>
          <div className="auth-input"><Mail size={18} aria-hidden /><input id="email" name="email" type="email" autoComplete="username" required placeholder="you@example.com" /></div>
          <div className="auth-row">
            <label htmlFor="password">비밀번호</label>
            <a href={`${MAIN_SITE}/forgot-password`} className="auth-link">비밀번호 찾기?</a>
          </div>
          <div className="auth-input"><Lock size={18} aria-hidden /><input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" /></div>
          <button className="button primary auth-submit" disabled={pending}>{pending ? "로그인 중…" : <>로그인 <ArrowRight size={16} aria-hidden /></>}</button>
        </form>
      )}
      <p className="auth-terms">
        계속 진행함으로써 귀하는 당사의 <a href={`${MAIN_SITE}/terms`} target="_blank" rel="noreferrer">이용약관</a> 및{" "}
        <a href={`${MAIN_SITE}/privacy`} target="_blank" rel="noreferrer">개인정보 처리방침</a>에 동의하게 됩니다.
      </p>
    </div>
  );
}
