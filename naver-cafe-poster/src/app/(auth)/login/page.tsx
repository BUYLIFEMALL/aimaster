"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { signInAction } from "@/lib/actions/auth";
import { APP_NAME, MAIN_SITE } from "@/lib/version";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") ?? "";
  const [mode, setMode] = useState<"login" | "signup">("login");
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
      if (!message.includes("NEXT_REDIRECT")) {
        setError(message || "로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] flex flex-col items-center relative z-10">
      {/* 1. [맨 위] 프로그램 고유 심볼 로고 (64~68px 라운드 스퀘어 아이콘) */}
      <div className="w-[68px] h-[68px] rounded-[22px] flex items-center justify-center mb-3.5 bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857] border border-emerald-400/30 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.35)] text-white text-3xl font-black">
        ☕
      </div>

      {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
      <div className="inline-flex items-center justify-center px-4 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 mb-2.5 shadow-sm">
        AIMASTER NAVER CAFE POSTER
      </div>

      {/* 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 */}
      <h1 className="text-[25px] font-black tracking-tight text-slate-100 mb-1 text-center">
        {APP_NAME}
      </h1>
      <p className="text-[12.5px] font-semibold text-slate-400 mb-6 text-center">
        AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
      </p>

      {/* 4. [중앙] 로그인/회원가입 카드 */}
      <div className="w-full bg-[#0F1523] border border-[#1E293B] rounded-[24px] p-7 sm:p-8 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.3)] text-left">
        {/* 2단 탭 세그먼트 (로그인 / 회원가입) */}
        <div className="flex bg-[#151D30] rounded-[14px] p-1 mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-center text-[12.5px] font-bold rounded-[10px] transition-all duration-150 ${
              mode === "login"
                ? "bg-[#1E293B] text-emerald-400 shadow-[0_2px_6px_rgba(0,0,0,0.3)] font-extrabold"
                : "text-slate-400 hover:text-slate-200"
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
            className={`flex-1 py-2 text-center text-[12.5px] font-bold rounded-[10px] transition-all duration-150 ${
              mode === "signup"
                ? "bg-[#1E293B] text-emerald-400 shadow-[0_2px_6px_rgba(0,0,0,0.3)] font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-center text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        {mode === "signup" ? (
          <div className="space-y-4 text-center py-2">
            <p className="text-sm text-slate-300 leading-relaxed">
              이 프로그램은 AIMaster 통합 계정과 구독 권한을 그대로 사용합니다.
              <br />
              AIMaster에서 회원가입 후 이 프로그램을 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE}/register`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d w-full mt-2 py-3 rounded-xl font-extrabold text-[14.5px] flex items-center justify-center gap-1.5"
            >
              <span>AIMaster 회원가입 하러가기</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />

            <div>
              <label htmlFor="email" className="block text-[12px] font-bold text-slate-300 mb-1.5">
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="buylifemall@gmail.com"
                  className="w-full bg-[#151D30] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[12px] font-bold text-slate-300">
                  비밀번호
                </label>
                <a
                  href={`${MAIN_SITE}/forgot-password`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11.5px] text-emerald-400 font-semibold hover:underline"
                >
                  비밀번호 찾기?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full bg-[#151D30] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                />
              </div>
            </div>

            {/* 3D 엠보싱 실행 버튼 (`로그인 →`) */}
            <button
              type="submit"
              disabled={pending}
              className="btn-3d w-full mt-2 py-3 rounded-xl font-extrabold text-[14.5px] flex items-center justify-center gap-1.5"
            >
              <span>{pending ? "로그인 확인 중..." : "로그인 →"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 준수) */}
        <p className="mt-5 text-center text-[11.5px] text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
          진행 시{" "}
          <a
            href={`${MAIN_SITE}/terms`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 font-bold hover:underline"
          >
            이용약관
          </a>{" "}
          및{" "}
          <a
            href={`${MAIN_SITE}/privacy`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 font-bold hover:underline"
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
    <Suspense fallback={<div className="text-slate-400 text-sm">로딩 중...</div>}>
      <LoginCard />
    </Suspense>
  );
}
