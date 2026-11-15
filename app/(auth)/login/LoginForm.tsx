"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GoldGradientText from "@/components/ui/GoldGradientText";
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

  // 2026-11-15 주인님 선택 B안 「누아르 골드 라운지」(시안 D:\PDS\Design\aimaster_main_login_20261115) — DESIGN.md 로그인 5단계 골격.
  // 화면 모양만 바꿈: 로그인·세션 제한·핸드폰 받기·이메일/비밀번호 찾기·가입 링크 동작은 그대로
  const field = "flex items-center gap-2.5 rounded-xl border border-[#2a2a36] bg-[#13131b] px-3.5 py-3 transition focus-within:border-[#d4af37] focus-within:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]";
  const inputCls = "w-full bg-transparent text-[15px] text-slate-100 outline-none placeholder:text-zinc-600";
  const goldBtn = "mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f5c842] to-[#d4af37] py-3.5 text-base font-extrabold text-[#1a1405] shadow-[0_5px_0_#8a6d12,0_12px_30px_rgba(245,200,66,0.25)] transition active:translate-y-[3px] active:shadow-[0_2px_0_#8a6d12] disabled:opacity-60";

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#0a0a0f",
        backgroundImage:
          "radial-gradient(circle at 50% 30%, rgba(212,175,55,0.16), transparent 45%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "auto, 40px 40px, 40px 40px",
      }}
    >
      <div className="relative w-full max-w-[440px] text-center">
        {/* 1. 로고 */}
        <Link href="/" aria-label="AI Master 홈" className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#2a2412] to-[#14120a] shadow-[0_0_40px_rgba(212,175,55,0.25)]">
          <GoldGradientText className="text-2xl font-black">AI</GoldGradientText>
        </Link>
        {/* 2. 영문명 배지 */}
        <span className="mt-4 inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-300">AI MASTER · BUYLIFE</span>
        {/* 3. 한글명 */}
        <h1 className="mt-3 text-[26px] font-black tracking-tight"><GoldGradientText>AI 마스터</GoldGradientText></h1>
        <p className="mt-1.5 text-sm text-slate-400">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>

        {/* 4. 폼 카드 */}
        <section className="mt-7 rounded-[28px] border border-white/10 bg-[rgba(22,22,30,0.72)] p-7 text-left shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {needPhone ? (
            <form onSubmit={handleSavePhone} className="space-y-5">
              <p role="alert" className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold-light">
                {PHONE_REQUIRED_MESSAGE}
                <span className="mt-1 block text-xs font-normal text-gold-light/80">아래 회원정보에서 핸드폰 번호를 저장하면 정상적으로 로그인됩니다.</span>
              </p>
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-200">이름</label>
                <div className={field}><input type="text" value={phoneName} onChange={(e) => setPhoneName(e.target.value)} className={inputCls} placeholder="홍길동" required /></div>
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-bold text-slate-200">핸드폰</label>
                <div className={field}><input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} className={inputCls} placeholder="010-1234-5678" required autoFocus /></div>
              </div>
              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}
              <button type="submit" disabled={loading} className={goldBtn}>{loading ? "저장 중..." : "핸드폰 번호 저장하고 계속하기"}</button>
            </form>
          ) : (
            <>
              {/* 로그인 / 회원가입 탭 */}
              <div className="grid grid-cols-2 rounded-xl bg-white/5 p-1 text-sm font-semibold">
                <span className="rounded-lg bg-amber-400/15 py-2.5 text-center text-amber-300 ring-1 ring-amber-400/30">로그인</span>
                <Link href="/register" className="py-2.5 text-center text-slate-400 hover:text-slate-200">회원가입</Link>
              </div>
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-[13px] font-bold text-slate-200">이메일 주소</label>
                  <div className={field}>
                    <Mail size={18} className="shrink-0 text-zinc-400" aria-hidden />
                    <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="your@email.com" required autoFocus autoComplete="email" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label htmlFor="login-password" className="text-[13px] font-bold text-slate-200">비밀번호</label>
                    <span className="whitespace-nowrap text-xs font-semibold">
                      <Link href="/find-email" className="text-amber-300/90 hover:underline">이메일 찾기</Link>
                      <span className="mx-1 text-zinc-600">·</span>
                      <Link href="/forgot-password" className="text-amber-300/90 hover:underline">비밀번호 찾기?</Link>
                    </span>
                  </div>
                  <div className={field}>
                    <Lock size={18} className="shrink-0 text-zinc-400" aria-hidden />
                    <input id="login-password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" required autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"} className="shrink-0 text-zinc-500 hover:text-slate-200">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {isPasswordReset && !error && (
                  <p className="text-sm bg-gold/10 border border-gold/30 text-gold-light rounded-lg px-4 py-3">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.</p>
                )}
                {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}

                <button type="submit" disabled={loading} className={goldBtn}>
                  {loading ? "로그인 중..." : <>로그인 <ArrowRight size={18} aria-hidden /></>}
                </button>
              </form>
            </>
          )}
          {/* 5. 약관 1행 */}
          <p className="mt-5 whitespace-nowrap text-center text-xs text-slate-500">
            진행 시 <Link href="/terms" className="font-bold text-amber-300">이용약관</Link> 및 <Link href="/privacy" className="font-bold text-amber-300">개인정보 처리방침</Link>에 동의합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
