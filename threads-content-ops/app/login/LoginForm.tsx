"use client";
import { BRAND_NAME } from "@/threads-content-ops/lib/deployment";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 독립 운영 모드 전용 이메일·비밀번호 로그인/가입(Supabase Auth). 2026-10-18 강의용 설치 키트.
export default function LoginForm({ next, confirmed = false }: { next: string; confirmed?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // 가입 확인 메일 링크를 다른 브라우저에서 연 경우(auth/confirm → ?confirmed=1): 인증은 끝났으니 로그인 안내
  const [message, setMessage] = useState(confirmed ? "메일 인증이 끝났습니다. 가입한 이메일과 비밀번호로 로그인해 주세요." : "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    try {
      if (mode === "signup") {
        // 확인 메일 링크가 Supabase 기본 Site URL(localhost)이 아니라 내 사이트로 돌아오게(2026-10-20). URL Configuration 허용은 마법사 마무리 단계.
        const emailRedirectTo = `${window.location.origin}/api/threads-content-ops/auth/confirm?next=${encodeURIComponent(next)}`;
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo } });
        if (error) throw error;
        if (!data.session) {
          setMessage("가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요. (설치자는 Supabase에서 Confirm email을 끄면 바로 로그인됩니다)");
          setMode("login");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setMessage(
        /Invalid login credentials/i.test(raw) ? "이메일 또는 비밀번호가 맞지 않습니다."
        : /Email not confirmed/i.test(raw) ? "가입 확인 메일의 링크를 먼저 눌러 주세요."
        : /already registered/i.test(raw) ? "이미 가입된 이메일입니다. 로그인해 주세요."
        : /Password should be/i.test(raw) ? "비밀번호는 6자 이상으로 정해 주세요."
        : `처리하지 못했습니다: ${raw}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-neutral-900">Threads 콘텐츠 운영 자동화</h1>
        {BRAND_NAME && <p className="text-xs text-neutral-400">{BRAND_NAME}</p>}
        <p className="mt-1 text-sm text-neutral-500">{mode === "login" ? "로그인" : "회원가입"}</p>
        <label className="mt-5 block text-sm font-medium text-neutral-700">
          이메일
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
        </label>
        <label className="mt-3 block text-sm font-medium text-neutral-700">
          비밀번호
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
        </label>
        {message && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{message}</p>}
        <button type="submit" disabled={busy}
          className="mt-5 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
        </button>
        <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}
          className="mt-3 w-full text-xs text-neutral-500 hover:text-neutral-900">
          {mode === "login" ? "처음이신가요? 회원가입" : "이미 계정이 있나요? 로그인"}
        </button>
      </form>
    </div>
  );
}
