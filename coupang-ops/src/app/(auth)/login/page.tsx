"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { signInAction } from "@/lib/actions/auth";
import { APP_NAME, MAIN_SITE } from "@/lib/version";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signInAction({}, new FormData(event.currentTarget));
      if (result?.error) setError(result.error);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("NEXT_REDIRECT")) setError(message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] flex flex-col items-center relative z-10">
      {/* 1. 맨 위 로고 */}
      <div className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center mb-4 bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] border border-[#C7D2FE] shadow-[0_8px_20px_-4px_rgba(79,70,229,0.25)]">
        <span className="text-[28px]" role="img" aria-label="Coupang Ops Logo">🚀</span>
      </div>

      {/* 2. 그 밑 프로그램 영어명 (알약 캡슐) */}
      <div className="inline-flex items-center justify-center px-4 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] mb-3">
        AIMASTER COUPANG OPS
      </div>

      {/* 3. 그 밑 프로그램 한글명 */}
      <h1 className="text-[26px] font-black tracking-tight text-slate-900 mb-1.5 text-center">
        {APP_NAME}
      </h1>
      <p className="text-[13.5px] font-medium text-slate-500 mb-6 text-center">
        AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
      </p>

      {/* 4. 로그인 카드 폼 */}
      <div className="w-full bg-white border border-[#E2E8F0] rounded-[24px] p-7 sm:p-8 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_8px_10px_-6px_rgba(15,23,42,0.04)]">
        {/* 탭 세그먼트 (로그인 / 회원가입) */}
        <div className="flex bg-[#F1F5F9] rounded-[14px] p-1 mb-6">
          <button
            type="button"
            className="flex-1 py-2.5 text-center text-[13.5px] font-bold rounded-[10px] bg-white text-[#1D4ED8] shadow-[0_2px_6px_rgba(0,0,0,0.06)] cursor-default"
          >
            로그인
          </button>
          <a
            href={`${MAIN_SITE}/register`}
            className="flex-1 py-2.5 text-center text-[13.5px] font-bold rounded-[10px] text-slate-500 hover:text-slate-800 transition-colors"
          >
            회원가입
          </a>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />

          <div>
            <label htmlFor="email" className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
              이메일 주소
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-[17px] h-[17px] text-slate-400 pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-[12.5px] font-bold text-slate-700">
                비밀번호
              </label>
              <a
                href={`${MAIN_SITE}/login`}
                className="text-[12px] font-bold text-[#2563EB] hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-[17px] h-[17px] text-slate-400 pointer-events-none" />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full mt-2 py-3.5 rounded-xl font-extrabold text-[15px] flex items-center justify-center gap-1.5 text-white bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] border border-[#1E40AF] shadow-[0_4px_0_#1E3A8A,0_6px_14px_rgba(29,78,216,0.3)] hover:-translate-y-0.5 hover:shadow-[0_5.5px_0_#1E3A8A,0_8px_18px_rgba(29,78,216,0.38)] active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.3)] transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            <span>{pending ? "로그인 확인 중…" : "로그인"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 5. 맨 아래 약관 문구 (1행으로 글자수 줄여 처리) */}
        <p className="mt-5 text-center text-[11.5px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
          진행 시{" "}
          <a
            href={`${MAIN_SITE}/terms`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] font-bold hover:underline"
          >
            이용약관
          </a>{" "}
          및{" "}
          <a
            href={`${MAIN_SITE}/privacy`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] font-bold hover:underline"
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
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-[#F8FAFC]"
      style={{
        backgroundImage: `linear-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.05) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      <Suspense fallback={<div className="text-slate-400 text-sm">로딩 중…</div>}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
