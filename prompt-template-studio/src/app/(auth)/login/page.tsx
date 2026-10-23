"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import {
  FileCode,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE_URL } from "@/lib/version";

type AuthTab = "login" | "signup";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";

  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
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
    <div className="w-full max-w-[440px] mx-auto">
      {/* 헤더 브랜딩 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 mb-3 ring-4 ring-indigo-50">
          <FileCode className="w-7 h-7" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{APP_NAME}</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {APP_VERSION}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[11px]">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            AIMaster 통합 계정
          </span>
        </div>
      </div>

      {/* 메인 인증 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm shadow-slate-100">
        {/* 2탭 세그먼트 토글 ([로그인] / [회원가입]) */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6 text-xs font-semibold text-slate-600 border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "login"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>로그인</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("signup");
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "signup"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>회원가입</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* 탭 1: 로그인 폼 */}
        {activeTab === "login" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  비밀번호
                </label>
                <a
                  href={`${MAIN_SITE_URL}/forgot-password`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:from-indigo-700 active:to-violet-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <span>{isPending ? "로그인 중..." : "로그인하고 프롬프트 스튜디오 시작"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* 탭 2: 회원가입 안내 (SSO 안내 + 혜택 + 메인 가입 링크) */
          <div className="space-y-4">
            <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-4 text-xs text-indigo-950">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>단 한 번의 가입으로 모든 스튜디오 연동</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                AIMaster 통합 계정으로 가입하시면 별도 추가 승인 없이 프롬프트 템플릿 스튜디오를 즉시 이용하실 수 있습니다.
              </p>
            </div>

            <div className="space-y-2.5 py-1">
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">검증된 프롬프트 템플릿 무제한 저장:</span> 나만의 비즈니스 맞춤형 프롬프트 라이브러리 구축
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">변수 치환 기반 원클릭 실행:</span> 실시간 Gemini/GPT 연동으로 원하는 결과 즉시 생성
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">철저한 개인 키 격리 보안:</span> 개인 API 키 직접 등록 및 안전한 브라우저 암호화
                </div>
              </div>
            </div>

            <a
              href={`${MAIN_SITE_URL}/register`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:from-indigo-700 active:to-violet-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <span>AIMaster에서 무료 회원가입하기</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
              >
                이미 계정이 있으신가요? <span className="underline font-semibold">로그인하기</span>
              </button>
            </div>
          </div>
        )}

        {/* 하단 공통 링크 */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <a
            href={`${MAIN_SITE_URL}/programs`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-indigo-600 transition-colors flex items-center gap-1"
          >
            ← 메인 서비스 카탈로그
          </a>
          <a
            href="/guide"
            className="hover:text-indigo-600 transition-colors font-medium flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-indigo-500" />
            연동 매뉴얼 확인
          </a>
        </div>
      </div>

      {/* 하단 약관 및 저작권 */}
      <div className="mt-6 text-center text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-center gap-3">
          <a
            href={`${MAIN_SITE_URL}/terms`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            이용약관
          </a>
          <span>•</span>
          <a
            href={`${MAIN_SITE_URL}/privacy`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            개인정보처리방침
          </a>
          <span>•</span>
          <a
            href={`${MAIN_SITE_URL}/support`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            고객지원
          </a>
        </div>
        <p className="text-[10px] text-slate-400/80">© AIMaster. All rights reserved.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)`,
        backgroundSize: "24px 24px",
      }}
    >
      <Suspense fallback={<div className="text-center text-sm text-slate-400">로딩 중...</div>}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
