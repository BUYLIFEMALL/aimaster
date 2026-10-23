"use client";

// 로그인 화면 — 바이닐 다크 레트로 콘솔 스타일 공식 표준 탭 토글 레이아웃 (2026-10-17 v1.08 agy 리뉴얼)
// 상단 [로그인] / [회원가입] 2버튼 탭 토글 + 딥 옵시디언 서피스 + 빈티지 골드/앰버 포인트.
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Lock, Mail, ArrowRight, UserPlus } from "lucide-react";

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
      if (!err?.message?.includes("NEXT_REDIRECT")) {
        setError(err.message || "로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#272b3f] bg-[#141620]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
      {/* 상단 2버튼 탭 토글 바 */}
      <div className="mb-6 flex rounded-xl bg-[#0c0d12] p-1 border border-[#272b3f]/80">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 ${
            mode === "login"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20"
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
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 ${
            mode === "signup"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-center text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      {mode === "signup" ? (
        <div className="space-y-5 text-center py-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b1e2c] border border-[#272b3f] text-amber-400">
            <UserPlus className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white">AIMaster 계정으로 이용하세요</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              이 프로그램은 AIMaster 통합 계정과 구독 권한을 사용합니다.
              <br />
              AIMaster 메인 사이트에서 가입 후 즉시 이용하실 수 있습니다.
            </p>
          </div>
          <a
            href={`${MAIN_SITE_URL}/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-500/35"
          >
            <span>AIMaster 회원가입 하러가기</span>
            <ArrowRight className="h-4 w-4" />
          </a>
          <div className="rounded-xl border border-[#272b3f]/80 bg-[#1b1e2c]/50 p-3 text-[11px] text-slate-500">
            💡 이미 가입된 계정이 있으신가요? 상단의 <span className="font-semibold text-slate-300">로그인</span> 탭을 클릭하세요.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              이메일 주소
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                name="email"
                required
                placeholder="example@naver.com"
                className="w-full rounded-xl border border-[#272b3f] bg-[#0c0d12] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 transition-all focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                비밀번호
              </label>
              <a
                href={`${MAIN_SITE_URL}/forgot-password`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#272b3f] bg-[#0c0d12] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-600 transition-all focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-500/35 disabled:opacity-50"
          >
            <span>{isPending ? "로그인 중..." : "로그인"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            계정이 없으신가요?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className="font-bold text-amber-400 hover:text-amber-300 hover:underline"
            >
              회원가입 안내
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12 text-xs text-slate-500">
          화면을 불러오는 중...
        </div>
      }
    >
      <LoginCard />
    </Suspense>
  );
}
