"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthButton, AuthShell } from "../_components/AuthShell";
import { formatPhoneNumber } from "@/lib/utils/format";
import { PHONE_REQUIRED_MESSAGE, hasRegisteredPhone, isValidPhone } from "@/lib/utils/phone";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // 로그인은 됐지만 핸드폰 번호가 없는 회원: 번호를 저장하기 전에는 다음 화면으로 보내지 않는다.
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  // 기본 이동은 메인 홈("/"). 예전 기본값이던 /dashboard 가 redirect 로 들어와도 홈으로 보낸다.
  const redirectParam = searchParams.get("redirect");
  const redirectTo = !redirectParam || redirectParam === "/dashboard" ? "/" : redirectParam;
  const isSessionExpired = searchParams.get("session_expired") === "true";
  const isPasswordReset = searchParams.get("reset") === "1";
  const supabase = createClient();

  // 세션 만료로 리디렉트된 경우: Supabase 세션 클리어
  useEffect(() => {
    if (isSessionExpired) {
      supabase.auth.signOut({ scope: "local" }).then(() => {
        setError("세션이 만료되었습니다. 다시 로그인해주세요.");
      });
    }
  }, [isSessionExpired, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 기존 호스트(www.buylife.xyz) 전용 옛 sb-* 쿠키가 남아 있으면 도메인 쿠키와 충돌할 수 있으므로 브라우저에서 먼저 만료 정리
    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0]?.trim();
        if (name && name.startsWith("sb-")) {
          document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      });
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(
        authError.status === 429
          ? "로그인 시도가 너무 많습니다. 1~2분 뒤에 다시 시도해주세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다."
      );
      setLoading(false);
      return;
    }

    // 세션 생성 (동시 접속 제한)
    try {
      const sessionRes = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_info: navigator.userAgent }),
      });

      if (sessionRes.status === 409) {
        const data = await sessionRes.json();
        setError(data.error || "이미 다른 기기에서 접속 중입니다.");
        await supabase.auth.signOut({ scope: "local" });
        setLoading(false);
        return;
      }
    } catch {
      // 세션 생성 실패해도 로그인은 진행
    }

    // 핸드폰 번호 확인(관리자는 제외)
    const { data: me } = await supabase.auth.getUser();
    if (me.user) {
      const { data: profile } = await supabase.from("profiles").select("name, phone, is_admin").eq("id", me.user.id).maybeSingle();
      if (profile && !profile.is_admin && !hasRegisteredPhone(profile.phone)) {
        setPhoneName(profile.name ?? "");
        setNeedPhone(true);
        setLoading(false);
        return;
      }
    }

    goNext();
    setLoading(false);
  };

  const goNext = () => {
    if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://")) {
      window.location.href = redirectTo;
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidPhone(phone)) {
      setError("핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)");
      return;
    }
    if (!phoneName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: phoneName, phone: formatPhoneNumber(phone) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
      setLoading(false);
      return;
    }
    goNext();
    setLoading(false);
  };

  // 2026-11-15 주인님 지시: 124번 「럭셔리 부티크 & 누아르 골드 다크」 기준 — 화면은 공용 틀 AuthShell(회원가입·찾기·재설정과 같음)
  // 로그인·세션 제한·핸드폰 받기·이메일/비밀번호 찾기·가입 링크 동작은 그대로
  const iconInput = "auth-input pl-10";
  const iconBox = "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-amber-400/60";

  return (
    <AuthShell subtitle="AIMaster 계정(이메일·비밀번호)으로 로그인하세요." tab={needPhone ? undefined : "login"}>
      {needPhone ? (
        <form onSubmit={handleSavePhone} className="space-y-4">
          <p role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-xs font-semibold text-amber-200">
            {PHONE_REQUIRED_MESSAGE}
            <span className="mt-1 block font-normal text-amber-200/80">아래 회원정보에서 핸드폰 번호를 저장하면 정상적으로 로그인됩니다.</span>
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">이름</label>
            <input type="text" value={phoneName} onChange={(e) => setPhoneName(e.target.value)} className="auth-input" placeholder="홍길동" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">핸드폰</label>
            <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} className="auth-input" placeholder="010-1234-5678" required autoFocus />
          </div>
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
          <AuthButton type="submit" disabled={loading} className="mt-5">{loading ? "저장 중..." : "핸드폰 번호 저장하고 계속하기"}</AuthButton>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-slate-300">이메일 주소</label>
            <div className="relative">
              <span className={iconBox}><Mail size={16} aria-hidden /></span>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={iconInput} placeholder="your@email.com" required autoFocus autoComplete="email" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="login-password" className="text-xs font-bold text-slate-300">비밀번호</label>
              <span className="whitespace-nowrap text-xs font-semibold">
                <Link href="/find-email" className="text-amber-400 hover:underline">이메일 찾기</Link>
                <span className="mx-1 text-slate-600">·</span>
                <Link href="/forgot-password" className="text-amber-400 hover:underline">비밀번호 찾기?</Link>
              </span>
            </div>
            <div className="relative">
              <span className={iconBox}><KeyRound size={16} aria-hidden /></span>
              <input id="login-password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${iconInput} pr-10`} placeholder="••••••••" required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"} className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isPasswordReset && !error && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.</p>
          )}
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

          <AuthButton type="submit" disabled={loading} className="mt-5">
            {loading ? "로그인 중..." : <>로그인 <ArrowRight size={16} aria-hidden /></>}
          </AuthButton>

          <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-5 text-xs">
            <span className="text-slate-500">처음이신가요?</span>
            <Link href="/register" className="font-bold text-amber-400 hover:underline">무료로 가입하기 &gt;</Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
