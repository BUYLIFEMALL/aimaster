"use client";

// 2026-11-01 주인님 절대 지침 5단계 표준 로그인 폼 규격 완비
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";

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
      const result = await signInAction(formData);
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full">
      {/* 1. [맨 위] 프로그램 고유 로고 (64~68px 라운드 스퀘어 아이콘) */}
      <div className="mb-4 flex justify-center">
        <div className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#06B6D4] to-[#0284C7] text-3xl shadow-lg shadow-mx-primary/25 ring-1 ring-white/20">
          📈
        </div>
      </div>

      {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
      <div className="mb-3 flex justify-center">
        <span className="rounded-full border border-mx-primary/40 bg-mx-primary/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-mx-link">
          AIMASTER TRENDING PRODUCT FINDER
        </span>
      </div>

      {/* 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black tracking-tight text-mx-text">
          실시간 급상승 소싱 트렌드 발굴기
        </h1>
        <p className="mt-1 text-xs font-semibold text-mx-muted">
          AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
        </p>
      </div>

      {/* 4. [중앙] 로그인/회원가입 폼 카드 */}
      <div className="rounded-2xl border border-mx-border bg-mx-surface p-7 shadow-2xl shadow-black/40">
        {/* 2단 탭 세그먼트 */}
        <div className="mb-6 flex rounded-xl border border-mx-border bg-mx-raised p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-mx-surface text-mx-link shadow-sm shadow-black/20"
                : "text-mx-muted hover:text-mx-text"
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
                ? "bg-mx-surface text-mx-link shadow-sm shadow-black/20"
                : "text-mx-muted hover:text-mx-text"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-mx-danger/30 bg-mx-danger/10 p-3 text-center text-xs font-bold text-mx-danger">
            {error}
          </div>
        )}

        {mode === "signup" ? (
          <div className="space-y-4 text-center">
            <p className="text-xs leading-relaxed text-mx-muted">
              이 프로그램은 AIMaster 통합 계정과 멤버십 구독 권한으로 구동됩니다.
              <br />
              AIMaster에서 회원가입 및 권한 등록 후 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE_URL}/register`}
              target="_blank"
              rel="noreferrer"
              className="btn-3d-cyan block w-full py-3 text-center text-sm font-black"
            >
              AIMaster 회원가입 바로가기 →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-mx-text">
                이메일 주소
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-mx-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="buylifemall@gmail.com"
                  className="w-full rounded-xl border border-mx-border bg-mx-raised py-3 pl-10 pr-4 text-sm text-mx-text placeholder:text-mx-muted transition-all focus:border-mx-primary focus:outline-none focus:ring-2 focus:ring-mx-primary/20"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-bold text-mx-text">
                  비밀번호
                </label>
                <a
                  href="#forgot-password"
                  onClick={(event) => {
                    event.preventDefault();
                    setError("비밀번호 재설정은 메인 사이트 고객센터를 이용해주세요.");
                  }}
                  className="text-xs font-bold text-mx-link hover:underline"
                >
                  비밀번호 찾기?
                </a>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-mx-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-[18px] w-[18px]"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-mx-border bg-mx-raised py-3 pl-10 pr-4 text-sm text-mx-text placeholder:text-mx-muted transition-all focus:border-mx-primary focus:outline-none focus:ring-2 focus:ring-mx-primary/20"
                />
              </div>
            </div>

            {/* 3D 엠보싱 실행 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-3d-cyan mt-2 flex w-full py-3.5 text-sm font-black"
            >
              {isPending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#04101A] border-t-transparent" />
              ) : (
                <>
                  로그인 시작 →
                </>
              )}
            </button>
          </form>
        )}

        {/* 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 지침) */}
        <p className="mt-6 text-center text-[11px] font-medium tracking-tight text-mx-muted whitespace-nowrap">
          진행 시{" "}
          <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" className="font-semibold text-mx-text underline">
            이용약관
          </a>
          {" "}및{" "}
          <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="font-semibold text-mx-text underline">
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
