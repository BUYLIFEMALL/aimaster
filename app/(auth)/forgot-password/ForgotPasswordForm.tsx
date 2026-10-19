"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, KeyRound } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { formatPhoneNumber } from "@/lib/utils/format";
import { isValidPhone } from "@/lib/utils/phone";

type Tab = "email" | "sms";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchTab = (next: Tab) => {
    setTab(next);
    setNotice("");
    setError("");
    setCodeSent(false);
    setCode("");
  };

  const post = async (url: string, payload: Record<string, string>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    const { ok, data } = await post("/api/auth/password-reset/email", { email });
    if (ok) setNotice(data.message);
    else setError(data.error || "요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
    setLoading(false);
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setNotice("");
    if (!isValidPhone(phone)) {
      setError("핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)");
      return;
    }
    setLoading(true);
    const { ok, data } = await post("/api/auth/password-reset/sms", { email, phone });
    if (ok) {
      setNotice(data.message);
      setCodeSent(true);
    } else {
      setError(data.error || "요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { ok, data } = await post("/api/auth/password-reset/sms/verify", { email, phone, code });
    if (ok && data.tokenHash) {
      router.push(`/reset-password?token_hash=${encodeURIComponent(data.tokenHash)}&type=recovery`);
      return;
    }
    setError(data.error || "인증번호를 확인하지 못했습니다.");
    setLoading(false);
  };

  const tabClass = (t: Tab) =>
    `flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
      tab === t ? "bg-gold/15 text-gold-light border border-gold/40" : "text-subtext hover:text-white border border-transparent"
    }`;

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
          <p className="text-subtext mt-3">본인 인증 후 새 비밀번호를 설정하세요</p>
        </div>

        <GlassCard>
          <div className="flex gap-2 mb-6">
            <button type="button" className={tabClass("email")} onClick={() => switchTab("email")}>
              <Mail size={16} /> 이메일로 인증
            </button>
            <button type="button" className={tabClass("sms")} onClick={() => switchTab("sms")}>
              <MessageSquare size={16} /> 문자로 인증
            </button>
          </div>

          {tab === "email" ? (
            <form onSubmit={handleEmail} className="space-y-5">
              <p className="text-sm text-subtext leading-relaxed">
                가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다. 링크는 1시간 동안 1번만 사용할 수 있습니다.
              </p>
              <div>
                <label className="block text-sm font-medium text-white mb-2">가입 이메일</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark w-full" placeholder="your@email.com" required autoFocus />
              </div>
              <Messages notice={notice} error={error} />
              <GoldButton type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? "보내는 중..." : <><Mail size={18} /> 재설정 메일 받기</>}
              </GoldButton>
            </form>
          ) : (
            <form onSubmit={codeSent ? handleVerify : handleSendCode} className="space-y-5">
              <p className="text-sm text-subtext leading-relaxed">
                가입한 이메일과 핸드폰 번호가 일치하면 6자리 인증번호를 문자로 보내드립니다.
              </p>
              <div>
                <label className="block text-sm font-medium text-white mb-2">가입 이메일</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark w-full" placeholder="your@email.com" required disabled={codeSent} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">핸드폰</label>
                <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} className="input-dark w-full" placeholder="010-1234-5678" required disabled={codeSent} />
              </div>
              {codeSent && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">인증번호</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                    className="input-dark w-full tracking-[0.4em] text-center text-lg"
                    placeholder="000000"
                    required
                    autoFocus
                  />
                  <button type="button" onClick={() => handleSendCode()} disabled={loading} className="mt-2 text-xs text-gold hover:underline disabled:opacity-50">
                    인증번호 다시 받기
                  </button>
                </div>
              )}
              <Messages notice={notice} error={error} />
              <GoldButton type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? "처리 중..." : codeSent ? <><KeyRound size={18} /> 인증하고 비밀번호 바꾸기</> : <><MessageSquare size={18} /> 인증번호 받기</>}
              </GoldButton>
            </form>
          )}

          <p className="text-center text-subtext text-sm mt-6">
            비밀번호가 기억나셨나요?{" "}
            <Link href="/login" className="text-gold hover:underline font-medium">
              로그인하기
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

function Messages({ notice, error }: { notice: string; error: string }) {
  return (
    <>
      {notice && <p className="text-sm bg-gold/10 border border-gold/30 text-gold-light rounded-lg px-4 py-3">{notice}</p>}
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}
    </>
  );
}
