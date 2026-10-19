"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
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
      supabase.auth.signOut().then(() => {
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
        await supabase.auth.signOut();
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* BG glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
              <span className="text-black font-black">AI</span>
            </div>
            <GoldGradientText className="text-2xl font-black">AI Master</GoldGradientText>
          </Link>
          <p className="text-subtext mt-3">계정에 로그인하세요</p>
        </div>

        <GlassCard>
          {needPhone ? (
            <form onSubmit={handleSavePhone} className="space-y-5">
              <p role="alert" className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold-light">
                {PHONE_REQUIRED_MESSAGE}
                <span className="mt-1 block text-xs font-normal text-gold-light/80">아래 회원정보에서 핸드폰 번호를 저장하면 정상적으로 로그인됩니다.</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-white mb-2">이름</label>
                <input type="text" value={phoneName} onChange={(e) => setPhoneName(e.target.value)} className="input-dark w-full" placeholder="홍길동" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">핸드폰</label>
                <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} className="input-dark w-full" placeholder="010-1234-5678" required autoFocus />
              </div>
              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
              )}
              <GoldButton type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? "저장 중..." : "핸드폰 번호 저장하고 계속하기"}
              </GoldButton>
            </form>
          ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark w-full"
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark w-full pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-subtext hover:text-white"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="mt-2 flex justify-end gap-3 text-xs">
                <Link href="/find-email" className="text-subtext hover:text-gold hover:underline">
                  이메일 찾기
                </Link>
                <Link href="/forgot-password" className="text-subtext hover:text-gold hover:underline">
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
            </div>

            {isPasswordReset && !error && (
              <p className="text-sm bg-gold/10 border border-gold/30 text-gold-light rounded-lg px-4 py-3">
                비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.
              </p>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <GoldButton type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "로그인 중..." : (
                <>
                  <LogIn size={18} />
                  로그인
                </>
              )}
            </GoldButton>
          </form>
          )}

          <p className="text-center text-subtext text-sm mt-6">
            계정이 없으신가요?{" "}
            <Link href="/register" className="text-gold hover:underline font-medium">
              무료로 가입하기
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
