"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
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

    router.push(redirectTo);
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
          <p className="text-subtext mt-3">계정에 로그인하세요</p>
        </div>

        <GlassCard>
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
            </div>

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
