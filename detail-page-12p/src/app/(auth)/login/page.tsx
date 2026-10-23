"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { LayoutTemplate, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, UserPlus, LogIn, ExternalLink } from "lucide-react";
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
    <div className="w-full max-w-md mx-auto">
      {/* 상단 브랜딩 영역 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-3 ring-1 ring-blue-400/30">
          <LayoutTemplate className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>AIMaster 통합 계정</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{APP_NAME}</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {APP_VERSION}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          하나의 계정으로 쿠팡·스마트스토어 12단 상세페이지를 원클릭으로 기획하고 렌더링하세요
        </p>
      </div>

      {/* 2탭 세그먼트 컨트롤 (로그인 / 회원가입) */}
      <div className="bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-1 mb-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setActiveTab("login");
            setError(null);
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "login"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          }`}
        >
          <LogIn className="w-3.5 h-3.5 text-blue-600" />
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
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-blue-600" />
          <span>회원가입</span>
        </button>
      </div>

      {/* 카드 서피스 */}
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xl shadow-slate-200/50">
        {error && (
          <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {activeTab === "login" ? (
          /* 로그인 탭 */
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="redirect" value={redirectTo} />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">이메일 주소</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="buylifemall@naver.com"
                    className="w-full pl-[42px] pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">비밀번호</label>
                  <a
                    href={`${MAIN_SITE_URL}/forgot-password`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    비밀번호를 잊으셨나요?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="비밀번호를 입력하세요"
                    className="w-full pl-[42px] pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? (
                  <span>로그인 확인 중...</span>
                ) : (
                  <>
                    <span>로그인하고 상세페이지 제작 시작</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>아직 계정이 없으신가요?</span>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors cursor-pointer"
              >
                무료 회원가입 안내 보기 ➔
              </button>
            </div>
          </div>
        ) : (
          /* 회원가입 탭 */
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-1">
                    AIMaster 통합 단일 계정 안내
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    AIMaster는 전 서브프로그램 단일 계정(Single Sign-On) 체계로 운영됩니다. 메인 플랫폼에서 한 번만 가입하시면 추가 절차 없이 상세페이지 스튜디오를 즉시 이용하실 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>쿠팡·스마트스토어 12단 섹션별 최적화 카피라이팅 & 이미지 생성</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>회원 본인 API 키 연동 격리 보관 (데이터 30일 보관 원칙)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>상세페이지 외 17개 이상 모든 AIMaster 자동화 프로그램 동시 접근</span>
              </div>
            </div>

            <a
              href={`${MAIN_SITE_URL}/register`}
              target="_blank"
              rel="noreferrer"
              className="w-full mt-3 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>AIMaster에서 무료 회원가입하기</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>이미 계정이 있으신가요?</span>
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors cursor-pointer"
              >
                로그인 화면으로 돌아가기 ➔
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 약관 및 링크 */}
      <div className="mt-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
          <a
            href={`${MAIN_SITE_URL}/terms`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-800 transition-colors"
          >
            이용약관
          </a>
          <span>•</span>
          <a
            href={`${MAIN_SITE_URL}/privacy`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-800 transition-colors"
          >
            개인정보처리방침
          </a>
          <span>•</span>
          <a
            href="mailto:buylifemall@gmail.com"
            className="hover:text-slate-800 transition-colors"
          >
            고객지원
          </a>
        </div>
        <p className="text-[10px] text-slate-400">
          © 2026 AIMaster. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] text-slate-900 selection:bg-blue-500/20 selection:text-blue-700"
      style={{
        backgroundImage: "radial-gradient(rgba(100, 116, 139, 0.15) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <Suspense fallback={<div className="text-xs text-slate-400">화면을 불러오는 중...</div>}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
