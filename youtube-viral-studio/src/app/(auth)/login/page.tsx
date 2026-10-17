"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Flame, Lock, Mail, ArrowRight } from "lucide-react";
import { APP_NAME } from "@/lib/version";

const MAIN_SITE_URL = "https://www.buylife.xyz";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await signInAction({}, formData);
      if (result?.error) setError(result.error);
    } catch (err: any) {
      // redirect()는 내부적으로 NEXT_REDIRECT 에러를 throw하므로 통과
      if (!err?.message?.includes("NEXT_REDIRECT")) {
        setError(err.message || "로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 헤더 로고 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-12 rounded-[28%] bg-yt-red text-white mb-3">
          <Flame className="w-8 h-8 fill-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-yt-text">{APP_NAME}</h1>
        <p className="text-xs text-yt-muted mt-1">
          AIMaster 계정으로 로그인하여 떡상 쇼츠를 발굴하세요
        </p>
      </div>

      <div className="bg-yt-surface rounded-2xl border border-yt-border p-8 shadow-sm">
        {/* 탭 전환 */}
        <div className="mb-6 flex rounded-full bg-yt-raised p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-full py-2.5 text-center text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-yt-red text-white"
                : "text-yt-muted hover:text-yt-text"
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
            className={`flex-1 rounded-full py-2.5 text-center text-xs font-bold transition-all ${
              mode === "signup"
                ? "bg-yt-red text-white"
                : "text-yt-muted hover:text-yt-text"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-yt-red/40 bg-yt-red/10 p-3 text-center text-xs font-semibold text-yt-danger">
            {error}
          </div>
        )}

        {mode === "signup" ? (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-yt-muted leading-relaxed">
              이 프로그램은 AIMaster 통합 계정으로 구동됩니다.
              <br />
              AIMaster에서 무료 회원가입 후 즉시 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE_URL}/register`}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-full bg-yt-red hover:bg-yt-red-hover py-3 text-xs font-bold text-white transition-colors shadow-xs"
            >
              <span>AIMaster 회원가입 하러가기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-yt-text"
              >
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-yt-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-yt-border bg-yt-raised py-2.5 pl-10 pr-3.5 text-xs text-yt-text placeholder:text-yt-muted focus:bg-yt-surface focus:outline-hidden focus:ring-2 focus:ring-yt-red focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold text-yt-text"
              >
                비밀번호
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-yt-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-yt-border bg-yt-raised py-2.5 pl-10 pr-3.5 text-xs text-yt-text placeholder:text-yt-muted focus:bg-yt-surface focus:outline-hidden focus:ring-2 focus:ring-yt-red focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-yt-red hover:bg-yt-red-hover py-3 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50 mt-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>로그인 확인 중...</span>
                </>
              ) : (
                <>
                  <span>로그인</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-yt-border text-center">
          <a
            href={`${MAIN_SITE_URL}/login`}
            className="text-[11px] text-yt-muted hover:text-yt-text transition-colors"
          >
            AIMaster 메인 사이트에서 로그인하기 &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-yt-bg flex items-center justify-center p-4" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255,0,0,0.12), transparent 55%)" }}>
      <Suspense>
        <LoginCard />
      </Suspense>
    </div>
  );
}
