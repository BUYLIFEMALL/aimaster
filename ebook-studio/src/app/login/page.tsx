"use client";

// 2026-11-01 5단계 표준 로그인 규격 및 97번 프리미엄 클래식 북바인딩 앰버 골드 테마 적용
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      window.location.href = redirectTo.startsWith("/") ? redirectTo : "/";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0C0E14] px-4 py-12 text-[#E2E8F0]">
      {/* 1단계: 68px 프로그램 고유 심볼 로고 */}
      <div className="mb-3 flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border border-[#F59E0B]/40 bg-gradient-to-br from-[#D97706] to-[#78350F] text-3xl shadow-[0_8px_24px_rgba(217,119,6,0.35)]">
        📖
      </div>

      {/* 2단계: 고대비 알약 캡슐 뱃지 */}
      <div className="mb-2.5 rounded-full border border-[#D97706]/40 bg-[#D97706]/15 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-[#FBBF24]">
        AIMASTER EBOOK STUDIO
      </div>

      {/* 3단계: 볼드 메인 타이틀 & 서브 안내 카피 */}
      <h1 className="mb-1 text-center text-2xl font-black tracking-tight text-white md:text-[26px]">
        AI 전자책 출판 스튜디오
      </h1>
      <p className="mb-6 text-center text-xs font-medium text-slate-400">
        AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
      </p>

      {/* 4단계: 로그인/회원가입 폼 카드 & 3D 엠보싱 골드 버튼 */}
      <div className="w-full max-w-[420px] rounded-2xl border border-[#272B38] bg-[#141720] p-7 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        {/* 2단 탭 세그먼트 */}
        <div className="mb-6 flex rounded-xl bg-[#0C0E14] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-[#D97706] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
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
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
              mode === "signup"
                ? "bg-[#D97706] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-center text-xs font-semibold text-red-400">
            {error}
          </div>
        )}

        {mode === "signup" ? (
          <div className="space-y-4 text-center">
            <p className="text-sm leading-relaxed text-slate-300">
              이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
              <br />
              AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE_URL}/register`}
              className="btn-3d btn-3d-amber-book block w-full py-3.5 text-sm font-bold text-white text-center"
            >
              AIMaster 회원가입 하러가기 →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                이메일 주소
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="author@example.com"
                className="w-full rounded-xl border border-[#272B38] bg-[#0C0E14] px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  비밀번호
                </label>
                <a
                  href={`${MAIN_SITE_URL}/forgot-password`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[#F59E0B] hover:underline"
                >
                  비밀번호 찾기?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#272B38] bg-[#0C0E14] px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
            </div>

            {/* 3D 엠보싱 골드 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className={`btn-3d btn-3d-amber-book flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold text-white ${
                isPending ? "cursor-not-allowed opacity-80" : ""
              }`}
            >
              {isPending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  로그인 ➔
                </>
              )}
            </button>
          </form>
        )}

        {/* 5단계: 약관 문구 1행 축소 처리 표준 규격 */}
        <p className="mt-6 text-center text-xs tracking-tight text-slate-500 whitespace-nowrap">
          진행 시{" "}
          <a
            href={`${MAIN_SITE_URL}/terms`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#F59E0B] hover:underline"
          >
            이용약관
          </a>{" "}
          및{" "}
          <a
            href={`${MAIN_SITE_URL}/privacy`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#F59E0B] hover:underline"
          >
            개인정보 처리방침
          </a>
          에 동의합니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}
