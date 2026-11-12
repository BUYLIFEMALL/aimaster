"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

const MAIN_SITE_URL = "https://www.buylife.xyz";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
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
    <div className="w-full max-w-md mx-auto">
      {/* 헤더 로고 & 101 보그 에디토리얼 테마 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white shadow-xl shadow-rose-500/25 mb-3 border border-rose-400/30">
          <Sparkles className="w-7 h-7 animate-pulse" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">{APP_NAME}</h1>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40">
            {APP_VERSION} PRO
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          초현실적 가상 인플루언서 화보 & 인스타그램 3종 캡션 자동 생성
        </p>
      </div>

      <div className="bg-[#141721] rounded-2xl border border-[#282e42] p-8 shadow-2xl">
        {error && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/40 p-3.5 text-xs text-rose-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              이메일 주소
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                placeholder="example@naver.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#1c202e] border border-[#282e42] text-slate-100 placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#1c202e] border border-[#282e42] text-slate-100 placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl font-bold text-xs btn-3d btn-3d-rose disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>{isPending ? "로그인 인증 중..." : "인플루언서 스튜디오 시작하기"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* 2026-11-01 표준 1행 약관 및 계정 링크 */}
        <div className="mt-6 pt-5 border-t border-[#282e42] text-center text-xs text-slate-400">
          <div className="flex items-center justify-center gap-3 text-[11px] mb-3">
            <a
              href={`${MAIN_SITE_URL}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-rose-300 transition-colors"
            >
              이용약관
            </a>
            <span className="text-slate-600">·</span>
            <a
              href={`${MAIN_SITE_URL}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-rose-300 transition-colors"
            >
              개인정보처리방침
            </a>
            <span className="text-slate-600">·</span>
            <a
              href={`${MAIN_SITE_URL}/signup`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-rose-400 hover:text-rose-300 transition-colors"
            >
              회원가입
            </a>
          </div>
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>AIMaster 안전 통합 인증 시스템으로 보호됩니다</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-slate-400">로딩 중...</div>}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
