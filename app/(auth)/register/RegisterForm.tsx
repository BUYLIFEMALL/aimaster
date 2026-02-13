"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";

function generateAffiliateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered") || signUpError.message.includes("already been registered")) {
        setError("이미 가입된 이메일입니다.");
      } else {
        setError(`오류: ${signUpError.message}`);
      }
      setLoading(false);
      return;
    }

    // 이메일 인증이 필요한 경우 (세션 없음)
    if (!data.session && data.user) {
      setError("가입 확인 이메일을 발송했습니다. 이메일을 확인해 주세요. (Supabase에서 이메일 인증을 끄면 바로 로그인됩니다)");
      setLoading(false);
      return;
    }

    // Create profile (세션 있을 때만)
    if (data.user) {
      let referredBy: string | null = null;
      if (refCode) {
        const { data: referrer } = await supabase
          .from("profiles")
          .select("id")
          .eq("affiliate_code", refCode)
          .single();
        referredBy = referrer?.id ?? null;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        name,
        affiliate_code: generateAffiliateCode(),
        referred_by: referredBy,
      });

      if (profileError && !profileError.message.includes("duplicate")) {
        setError(`프로필 생성 오류: ${profileError.message}`);
        setLoading(false);
        return;
      }
    }

    // 환영 이메일 발송 (비동기, 실패해도 가입 진행에 영향 없음)
    fetch("/api/email/welcome", { method: "POST" }).catch(() => {});

    router.push("/dashboard");
    router.refresh();
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
          <p className="text-subtext mt-3">무료로 시작하세요</p>
          {refCode && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-gold bg-gold/10 px-3 py-1 rounded-full border border-gold/20">
              추천 코드: {refCode}
            </div>
          )}
        </div>

        <GlassCard>
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-dark w-full"
                placeholder="홍길동"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark w-full"
                placeholder="your@email.com"
                required
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
                  placeholder="8자 이상"
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
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <GoldButton type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "가입 중..." : (
                <>
                  <UserPlus size={18} />
                  무료 회원가입
                </>
              )}
            </GoldButton>
          </form>

          <p className="text-center text-subtext text-sm mt-6">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-gold hover:underline font-medium">
              로그인
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
