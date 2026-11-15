"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, UserRound } from "lucide-react";
import { AuthButton, AuthShell } from "../_components/AuthShell";
import { formatPhoneNumber } from "@/lib/utils/format";
import { isValidPhone } from "@/lib/utils/phone";
import CodeTimer from "../_components/CodeTimer";

const CODE_TTL_MS = 5 * 60 * 1000;

export default function FindEmailForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeExp, setCodeExp] = useState<number | null>(null);
  const [emails, setEmails] = useState<string[] | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const post = async (url: string, payload: Record<string, string>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setNotice("");
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)");
      return;
    }
    setLoading(true);
    const { ok, data } = await post("/api/auth/find-email/sms", { name, phone });
    if (ok) {
      setNotice(data.message);
      setCodeSent(true);
      setCodeExp(Date.now() + CODE_TTL_MS);
    } else {
      setError(data.error || "요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { ok, data } = await post("/api/auth/find-email/sms/verify", { name, phone, code });
    if (ok && Array.isArray(data.emails)) {
      setEmails(data.emails);
      setNotice("");
    } else {
      setError(data.error || "인증번호를 확인하지 못했습니다.");
    }
    setLoading(false);
  };

  return (
    <AuthShell subtitle="가입한 이메일(아이디)을 찾습니다">
          {emails ? (
            <div className="space-y-5">
              <p className="text-sm text-subtext">본인 인증이 완료되었습니다. 가입한 이메일은 아래와 같습니다.</p>
              <ul className="space-y-2">
                {emails.map((m) => (
                  <li key={m} className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 font-semibold text-gold-light">
                    <UserRound size={16} /> {m}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-subtext">개인정보 보호를 위해 이메일 일부를 가려서 보여드립니다.</p>
              <div className="flex gap-2">
                <AuthButton type="button" fullWidth onClick={() => router.push("/login")}>로그인하기</AuthButton>
                <AuthButton type="button" variant="outline" fullWidth onClick={() => router.push("/forgot-password")}>비밀번호 찾기</AuthButton>
              </div>
            </div>
          ) : (
            <form onSubmit={codeSent ? handleVerify : handleSendCode} className="space-y-5">
              <p className="text-sm text-subtext leading-relaxed">
                가입할 때 입력한 이름과 핸드폰 번호가 일치하면 6자리 인증번호를 문자로 보내드립니다.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">이름</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="auth-input w-full" placeholder="홍길동" required autoFocus disabled={codeSent} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">핸드폰</label>
                <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} className="auth-input w-full" placeholder="010-1234-5678" required disabled={codeSent} />
              </div>
              {codeSent && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-300">인증번호</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                    className="auth-input w-full tracking-[0.4em] text-center text-lg"
                    placeholder="000000"
                    required
                    autoFocus
                  />
                  <CodeTimer expiresAt={codeExp} />
                  <button type="button" onClick={() => handleSendCode()} disabled={loading} className="mt-2 text-xs text-gold hover:underline disabled:opacity-50">
                    인증번호 다시 받기
                  </button>
                </div>
              )}
              {notice && <p className="text-sm bg-gold/10 border border-gold/30 text-gold-light rounded-lg px-4 py-3">{notice}</p>}
              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}
              <AuthButton type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? "처리 중..." : codeSent ? <><Search size={18} /> 인증하고 이메일 찾기</> : <><MessageSquare size={18} /> 인증번호 받기</>}
              </AuthButton>
            </form>
          )}

          <p className="text-center text-subtext text-sm mt-6">
            <Link href="/login" className="text-gold hover:underline font-medium">로그인</Link>
            <span className="mx-2 text-subtext/50">|</span>
            <Link href="/forgot-password" className="text-gold hover:underline font-medium">비밀번호 찾기</Link>
          </p>
    </AuthShell>
  );
}
