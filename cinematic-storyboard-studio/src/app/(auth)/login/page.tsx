"use client";

// 🔐 로그인 페이지 UI 레퍼런스 레이아웃 표준 규격 (2026-11-01 주인님 절대 지시)
// 1. [맨 위] 프로그램 고유 로고 (64px 심볼 아이콘 + 레드 그라데이션)
// 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지: AIMASTER CINEMATIC STORYBOARD)
// 3. [그 밑] 프로그램 한글명 (AI 시네마틱 스토리보드)
// 4. [중앙] 로그인/회원가입 폼 카드 + 3D 엠보싱 레드 버튼 (로그인 →)
// 5. [맨 아래] 약관 문구 1행 축소 처리 (진행 시 이용약관 및 개인정보 처리방침에 동의합니다.)
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Clapperboard, Mail, Lock, ArrowRight } from "lucide-react";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

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
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (!e?.message?.includes("NEXT_REDIRECT")) {
        setError(e?.message || "로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#283342] bg-[#141a23] p-7 shadow-2xl backdrop-blur-md">
      {/* 2단 탭 세그먼트 */}
      <div className="mb-6 flex rounded-xl bg-[#090d13] p-1 border border-[#283342]">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 cursor-pointer ${
            mode === "login"
              ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-600/30"
              : "text-gray-400 hover:text-white"
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
          className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 cursor-pointer ${
            mode === "signup"
              ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-600/30"
              : "text-gray-400 hover:text-white"
          }`}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-300">
          {error}
        </div>
      )}

      {mode === "signup" ? (
        <div className="space-y-4 text-center py-2">
          <p className="text-xs leading-relaxed text-gray-300">
            이 프로그램은 AIMaster 통합 계정과 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 즉시 이용하실 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE_URL}/register`}
            className="btn-3d-red flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-black no-underline"
          >
            <span>AIMaster 통합 회원가입</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-300">
              이메일 주소
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="director@buylife.xyz"
                className="w-full rounded-xl border border-[#283342] bg-[#090d13] py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 transition-all focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300">
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  setError("비밀번호 재설정은 AIMaster 메인 사이트에서 가능합니다.");
                }}
                className="text-[11px] font-semibold text-red-400 hover:text-red-300 hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#283342] bg-[#090d13] py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 transition-all focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </div>
          </div>

          {/* 3D 엠보싱 헐리우드 레드 실행 버튼 */}
          <button
            type="submit"
            disabled={isPending}
            className="btn-3d-red mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>로그인</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* 5단계 맨 아래: 약관 문구 1행 축소 처리 */}
      <div className="mt-6 text-center border-t border-[#283342]/60 pt-4">
        <p className="whitespace-nowrap text-[11px] text-gray-400">
          진행 시{" "}
          <a
            href={`${MAIN_SITE_URL}/terms`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-gray-300 underline hover:text-white"
          >
            이용약관
          </a>
          {" 및 "}
          <a
            href={`${MAIN_SITE_URL}/privacy`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-gray-300 underline hover:text-white"
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
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-[#090d13] text-[#f0f6fc] overflow-hidden">
      {/* 헐리우드 뷰파인더 앰비언트 글로우 배경 */}
      <div className="absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-red-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-[450px] w-[450px] rounded-full bg-amber-500/15 blur-[120px] pointer-events-none" />

      {/* 5단계 표준 규격 컨테이너 */}
      <div className="relative z-10 w-full max-w-[440px]">
        {/* 1단계 ~ 3단계: 로고, 영문 알약 뱃지, 한글 타이틀 */}
        <div className="mb-7 flex flex-col items-center text-center">
          {/* 1. 64px 라운드 스퀘어 로고 (레드 그라데이션 + 글로우) */}
          <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-amber-600 text-white shadow-xl shadow-red-600/30 border border-red-400/40 glow-red">
            <Clapperboard className="h-8 w-8 text-white drop-shadow" />
          </div>

          {/* 2. 영문명 알약 캡슐 뱃지 */}
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span>AIMASTER CINEMATIC STORYBOARD</span>
          </div>

          {/* 3. 한글 타이틀 및 보조 문구 */}
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            AI 시네마틱 <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-yellow-200">스토리보드</span>
          </h1>
          <p className="mt-1 text-xs text-gray-400">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>

        {/* 4단계: 로그인 카드 */}
        <Suspense fallback={<div className="h-64 rounded-2xl bg-[#141a23] animate-pulse" />}>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
