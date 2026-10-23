"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);

    // 메일 미리보기·보안 검사기가 링크를 먼저 열어도 토큰이 쓰이지 않도록, 저장 버튼을 누를 때 인증한다.
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (verifyError) {
      setError("링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 진행해주세요.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(
        /different|same/i.test(updateError.message)
          ? "이전과 다른 비밀번호를 입력해주세요."
          : "비밀번호를 바꾸지 못했습니다. 비밀번호 찾기를 다시 진행해주세요."
      );
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=1");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
              <span className="text-black font-black">AI</span>
            </div>
            <GoldGradientText className="text-2xl font-black">AI Master</GoldGradientText>
          </Link>
          <p className="text-subtext mt-3">새 비밀번호를 설정하세요</p>
        </div>

        <GlassCard>
          {!tokenHash ? (
            <div className="space-y-5 text-center">
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                재설정 링크가 올바르지 않습니다. 비밀번호 찾기를 다시 진행해주세요.
              </p>
              <Link href="/forgot-password" className="text-gold hover:underline font-medium text-sm">
                비밀번호 찾기로 이동
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">새 비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-dark w-full pr-10"
                    placeholder="6자 이상"
                    autoComplete="new-password"
                    required
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtext hover:text-white">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">새 비밀번호 확인</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-dark w-full"
                  placeholder="한 번 더 입력"
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}
              <GoldButton type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? "저장 중..." : <><KeyRound size={18} /> 새 비밀번호 저장</>}
              </GoldButton>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
