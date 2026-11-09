"use client";

// 2026-11-01 주인님 절대 지침: 5단계 표준 로그인 폼 규격 (78. 미니멀 스마트스토어 아틀리에 스타일)
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
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
    <div className="w-full max-w-[440px] text-center">
      {/* 1. [맨 위] 프로그램 고유 로고 (64~68px 라운드 스퀘어 아이콘) */}
      <div className="mb-3.5 flex justify-center">
        <div className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-3xl shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/30">
          🛒
        </div>
      </div>

      {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
      <div className="mb-2.5 flex justify-center">
        <span className="rounded-full border border-emerald-300/60 bg-emerald-50 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800">
          AIMASTER SMARTSTORE REGISTER
        </span>
      </div>

      {/* 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {APP_NAME}
        </h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
        </p>
      </div>

      {/* 4. [중앙] 로그인/회원가입 폼 카드 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 text-left">
        {/* 2단 탭 세그먼트 */}
        <div className="mb-5 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
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
            className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
              mode === "signup"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-bold text-rose-700"
          >
            {error}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />

            <div>
              <label htmlFor="email" className="slw-label">
                이메일 주소
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ✉️
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="slw-field pl-9"
                  placeholder="buylifemall@gmail.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="slw-label">
                비밀번호
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔒
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="slw-field pl-9"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                로그인 유지
              </label>
              <a
                href={`${MAIN_SITE}/forgot-password`}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-emerald-700 hover:underline"
              >
                비밀번호 찾기?
              </a>
            </div>

            {/* 하단 입체 섀도우의 3D 엠보싱 실행 버튼 */}
            <button
              type="submit"
              disabled={pending}
              className="btn-3d-sage w-full py-3 text-sm font-black"
            >
              {pending ? "로그인 확인 중…" : "로그인 시작 →"}
            </button>
          </form>
        ) : (
          <div className="py-2 text-center space-y-4">
            <p className="text-xs leading-relaxed text-slate-600">
              {APP_NAME}은 AIMaster 통합 계정과 멤버십 구독 권한으로 구동됩니다.
              <br />
              메인 플랫폼에서 회원가입 후 즉시 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE}/signup`}
              target="_blank"
              rel="noreferrer"
              className="btn-3d-sage inline-flex w-full justify-center py-3 text-xs font-black"
            >
              AIMaster 통합 회원가입 페이지로 이동 →
            </a>
          </div>
        )}
      </div>

      {/* 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 규격) */}
      <div className="mt-4 text-center text-[11px] text-slate-500 whitespace-nowrap">
        진행 시{" "}
        <a
          href={`${MAIN_SITE}/terms`}
          target="_blank"
          rel="noreferrer"
          className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
        >
          이용약관
        </a>
        {" 및 "}
        <a
          href={`${MAIN_SITE}/privacy`}
          target="_blank"
          rel="noreferrer"
          className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
        >
          개인정보 처리방침
        </a>
        에 동의합니다.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </div>
  );
}
