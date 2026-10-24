"use client";

// 로그인 카드 — DESIGN.md §5 표준 2탭(기준: threads-comment-reply/app/(auth)/login/page.tsx).
// 로그인은 AIMaster 공용 계정(Supabase), 회원가입은 AIMaster에서만 받는다 — 회원가입 탭은 메인 사이트로 안내.
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAIN_SITE_URL = "https://www.buylife.xyz";

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="18" height="18" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
);
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="18" height="18" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
);

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("이메일 또는 비밀번호를 확인해주세요.");
      setPending(false);
      return;
    }
    // 로그인 뒤에는 이 사이트 안 주소로만 돌아간다(다른 사이트로 보내는 주소는 무시).
    const target = searchParams.get("redirect") || "/dashboard";
    router.push(target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard");
    router.refresh();
  }

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError("");
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>로그인</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>회원가입</button>
      </div>

      {error && <div className="auth-error" role="alert">{error}</div>}

      {mode === "signup" ? (
        <div className="auth-signup">
          <p>
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a className="auth-primary" href={`${MAIN_SITE_URL}/register`}>AIMaster 회원가입 하러가기</a>
        </div>
      ) : (
        <form className="auth-form" onSubmit={signIn}>
          <div className="auth-field">
            <label htmlFor="email">이메일 주소</label>
            <div className="auth-input">
              <span className="auth-icon"><MailIcon /></span>
              <input id="email" type="email" autoComplete="email" placeholder="developer@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
          </div>
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="password">비밀번호</label>
              <a href={`${MAIN_SITE_URL}/forgot-password`} target="_blank" rel="noreferrer">비밀번호 찾기?</a>
            </div>
            <div className="auth-input">
              <span className="auth-icon"><LockIcon /></span>
              <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
          </div>
          <button className="auth-primary" type="submit" disabled={pending}>
            {pending ? "로그인 중..." : "로그인 →"}
          </button>
        </form>
      )}

      <p className="auth-foot">
        계속 진행함으로써 귀하는 당사의{" "}
        <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer">이용약관</a> 및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer">개인정보 처리방침</a>에 동의하게 됩니다.
      </p>
    </div>
  );
}
