"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { handoffIdFromHash } from "@/lib/keywordEvidence";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("이메일 또는 비밀번호를 확인해주세요.");
      setPending(false);
      return;
    }
    // BLC-11 v2.03: 키워드 도구에서 넘어온 기록 번호(#…keyword-report=…)는 로그인 뒤 주소에 그대로 붙인다(번호 모양일 때만).
    const handoffId = handoffIdFromHash(window.location.hash);
    router.push((searchParams.get("redirect") || "/dashboard") + (handoffId ? `#title&keyword-report=${handoffId}` : ""));
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={signIn}>
      <div className="field"><label htmlFor="email">이메일</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      <div className="field"><label htmlFor="password">비밀번호</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={pending}>{pending ? "로그인 중..." : "AIMaster 계정으로 로그인"}</button>
    </form>
  );
}
