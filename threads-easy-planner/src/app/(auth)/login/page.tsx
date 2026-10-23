"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { IS_STANDALONE } from "@/lib/deployment";

const MAIN_SITE_URL = "https://www.buylife.xyz";

/**
 * 독립 운영(수강생 배포판) 전용 회원가입 — AIMaster 가입 화면 대신 이 사이트의 Supabase에 바로 가입한다(2026-10-23).
 * 확인 메일 링크는 이 사이트 /auth/confirm 으로 돌아오게 지정한다(지정하지 않으면 Supabase 기본 Site URL=localhost로 감, 2026-10-20 리허설).
 */
function StandaloneSignupForm({ redirectTo, onDone }: { redirectTo: string; onDone: (message: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (password.length < 6) {
      setError("비밀번호는 6자 이상으로 정해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const next = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
      const emailRedirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
      if (signUpError) throw signUpError;
      if (!data.session) {
        onDone("가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요. (설치자는 Supabase에서 Confirm email을 끄면 바로 로그인됩니다)");
        return;
      }
      window.location.href = next;
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(
        /already registered/i.test(raw) ? "이미 가입된 이메일입니다. 로그인해 주세요."
        : /Password should be/i.test(raw) ? "비밀번호는 6자 이상으로 정해 주세요."
        : `가입하지 못했습니다: ${raw}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSignup} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs font-medium text-red-600">{error}</div>
      )}
      <div>
        <label htmlFor="signup-email" className="mb-1.5 block text-xs font-semibold text-zinc-700">이메일 주소</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@example.com"
          className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 py-3 px-4 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-[#005acc] focus:outline-none focus:ring-1 focus:ring-[#005acc]/20"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="mb-1.5 block text-xs font-semibold text-zinc-700">비밀번호 (6자 이상)</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 py-3 px-4 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-[#005acc] focus:outline-none focus:ring-1 focus:ring-[#005acc]/20"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-[#005acc] py-3 text-sm font-semibold text-[#ffffff] shadow-sm transition-all hover:bg-[#004bb9] active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? "가입 중..." : "회원가입 →"}
      </button>
    </form>
  );
}

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("confirmed") === "1" ? "메일 인증이 끝났습니다. 로그인해 주세요." : null,
  );
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await signInAction({}, formData);
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
      <div className="mb-6 flex rounded-xl bg-[#e8effd]/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-all duration-200 ${
            mode === "login"
              ? "bg-[#005acc] text-white shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-all duration-200 ${
            mode === "signup"
              ? "bg-[#005acc] text-white shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs font-medium text-red-600">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {mode === "signup" && IS_STANDALONE ? (
        <StandaloneSignupForm
          redirectTo={redirectTo}
          onDone={(message) => {
            setNotice(message);
            setMode("login");
          }}
        />
      ) : mode === "signup" ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-zinc-600 leading-relaxed">
            이 프로그램은 AIMaster 통합 계정으로 로그인합니다.
            <br />
            AIMaster에서 회원가입 후 바로 이용하실 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="block w-full rounded-xl bg-[#005acc] py-3 text-sm font-semibold text-white no-underline shadow-sm transition-all hover:bg-[#004bb9]"
          >
            AIMaster 회원가입 하러가기
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              이메일 주소
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 py-3 px-4 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-[#005acc] focus:outline-none focus:ring-1 focus:ring-[#005acc]/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 py-3 px-4 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-[#005acc] focus:outline-none focus:ring-1 focus:ring-[#005acc]/20"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-[#005acc] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#004bb9] active:scale-[0.99] disabled:opacity-50"
          >
            {isPending ? "로그인 중..." : "로그인 →"}
          </button>
        </form>
      )}

      {!IS_STANDALONE && (
        <div className="mt-8 border-t border-zinc-100 pt-5 text-center text-[11px] text-zinc-400">
          계정 관련 문의 및 이용안내:{" "}
          <a href={MAIN_SITE_URL} className="text-zinc-600 underline hover:text-zinc-900">
            AIMaster 홈
          </a>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-zinc-500 py-12">로딩 중...</div>}>
      <LoginCard />
    </Suspense>
  );
}
