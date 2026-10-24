"use client";
// 로그인·회원가입 화면 — AIMaster 공식 표준 2탭 레이아웃(DESIGN.md 14번, 기준: threads-comment-reply/app/(auth)/login/page.tsx).
// 로그인은 AIMaster 통합 계정(Supabase), 회원가입·비밀번호 찾기는 메인 사이트에서만 받는다.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAIN_SITE } from "@/lib/version";

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
);
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
);
const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
);

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (error) {
        setError("이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }
      window.location.assign(next);
    } catch {
      setError("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const tab = (m: "login" | "signup", label: string) => (
    <button
      type="button"
      className={mode === m ? "active" : ""}
      aria-pressed={mode === m}
      onClick={() => {
        setMode(m);
        setError("");
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="aww-auth-card">
      <div className="aww-auth-tabs" role="group" aria-label="로그인 또는 회원가입">
        {tab("login", "로그인")}
        {tab("signup", "회원가입")}
      </div>

      {error && (
        <p role="alert" className="aww-auth-error">
          {error}
        </p>
      )}

      {mode === "signup" ? (
        <div className="aww-auth-signup">
          <p>
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a className="aww-auth-primary" href={`${MAIN_SITE}/register`}>
            AIMaster 회원가입 하러가기
          </a>
        </div>
      ) : (
        <form onSubmit={login} className="aww-auth-form">
          <div>
            <label htmlFor="aww-email">이메일 주소</label>
            <div className="aww-auth-field">
              <MailIcon />
              <input id="aww-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required />
            </div>
          </div>
          <div>
            <div className="aww-auth-row">
              <label htmlFor="aww-password">비밀번호</label>
              <a href={`${MAIN_SITE}/forgot-password`} target="_blank" rel="noreferrer">
                비밀번호 찾기?
              </a>
            </div>
            <div className="aww-auth-field">
              <LockIcon />
              <input id="aww-password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
            </div>
          </div>
          <button type="submit" className="aww-auth-primary" disabled={pending}>
            {pending ? "로그인 중…" : (
              <>
                로그인 <ArrowIcon />
              </>
            )}
          </button>
        </form>
      )}

      <p className="aww-auth-legal">
        계속 진행함으로써 귀하는 당사의{" "}
        <a href={`${MAIN_SITE}/terms`} target="_blank" rel="noreferrer">
          이용약관
        </a>{" "}
        및{" "}
        <a href={`${MAIN_SITE}/privacy`} target="_blank" rel="noreferrer">
          개인정보 처리방침
        </a>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}
