"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, UserPlus, LogIn, ExternalLink, Palette } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

const MAIN_SITE_URL = "https://www.buylife.xyz";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";

  const [activeTab, setActiveTab] = useState<"login" | "signup">(initialTab);
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
    <div className="w-full max-w-[440px] mx-auto flex flex-col items-center">
      {/* 1단계: [맨 위] 프로그램 고유 로고 (64px 라운드 스퀘어 심볼) */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-pink-500 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center mb-3.5 border border-white/20">
        <Palette className="w-8 h-8 drop-shadow-md" />
      </div>

      {/* 2단계: [그 밑] 프로그램 영문명 알약 캡슐 뱃지 */}
      <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-slate-900/80 border border-indigo-500/40 text-indigo-300 text-[11px] font-extrabold uppercase tracking-wide mb-2.5 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        <span>AIMASTER ALL-IN-ONE GRAPHIC</span>
      </div>

      {/* 3단계: [그 밑] 프로그램 한글명 볼드 메인 타이틀 + 서브 안내 카피 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-black text-white tracking-tight">
            AI 올인원 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">그래픽 자동화</span>
          </h1>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            {APP_VERSION}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
        </p>
      </div>

      {/* 4단계: [중앙] 로그인/회원가입 폼 카드 (2단 세그먼트 + 3D 엠보싱 버튼) */}
      <div className="w-full bg-[#111726]/90 backdrop-blur-xl rounded-2xl border border-indigo-500/30 p-6 sm:p-7 shadow-2xl shadow-black/70">
        {/* 2단 탭 세그먼트 */}
        <div className="bg-[#0b101d] p-1.5 rounded-xl border border-slate-700/60 grid grid-cols-2 gap-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "login"
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>로그인</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("signup");
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "signup"
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>회원가입</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300 font-medium">
            {error}
          </div>
        )}

        {activeTab === "login" ? (
          /* 로그인 탭 */
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">이메일 주소</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="designer@buylife.xyz"
                  className="w-full pl-[42px] pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">비밀번호</label>
                <a
                  href={`${MAIN_SITE_URL}/forgot-password`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  비밀번호 찾기?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-[42px] pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all outline-hidden"
                />
              </div>
            </div>

            {/* 3D 엠보싱 인디고 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-3.5 px-4 btn-3d-indigo text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <span>로그인 확인 중...</span>
              ) : (
                <>
                  <span>로그인 →</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* 회원가입 탭 */
          <div className="space-y-4">
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white mb-1">
                    AIMaster 단일 계정 안내
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    AIMaster는 전 서브프로그램 단일 계정(Single Sign-On)으로 운영됩니다. 메인 플랫폼에서 한 번만 가입하시면 추가 절차 없이 그래픽 스튜디오를 즉시 이용하실 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>123종 전문 그래픽 템플릿 즉시 생성 & 인페인팅</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>회원 본인 API 키 연동 격리 보관 (데이터 30일 보관 원칙)</span>
              </div>
            </div>

            <a
              href={`${MAIN_SITE_URL}/register`}
              target="_blank"
              rel="noreferrer"
              className="w-full mt-2 py-3.5 px-4 btn-3d-indigo text-xs flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <span>AIMaster에서 무료 회원가입하기</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* 5단계: [맨 아래] 약관 문구 1행 축소 처리 (필수 규격 준수) */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 whitespace-nowrap">
            진행 시{" "}
            <a
              href={`${MAIN_SITE_URL}/terms`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 underline font-semibold hover:text-white"
            >
              이용약관
            </a>
            {" "}및{" "}
            <a
              href={`${MAIN_SITE_URL}/privacy`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 underline font-semibold hover:text-white"
            >
              개인정보 처리방침
            </a>
            에 동의합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-[#080d1a] text-white selection:bg-indigo-500/30 selection:text-indigo-200"
      style={{
        backgroundImage: "radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <Suspense fallback={<div className="text-xs text-slate-400">화면을 불러오는 중...</div>}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
