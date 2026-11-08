"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { APP_NAME_FULL, APP_VERSION } from "@/lib/version";

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
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center text-center w-full">
      {/* 1단계: 프로그램 고유 로고 (64px 라운드 스퀘어 심볼) */}
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #FF0000 0%, #D90429 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          boxShadow: "0 8px 20px rgba(225, 29, 72, 0.35)",
          border: "2px solid rgba(255, 255, 255, 0.3)",
          marginBottom: "14px",
        }}
      >
        🎬
      </div>

      {/* 2단계: 프로그램 영문명 (알약 캡슐 뱃지) */}
      <div
        style={{
          padding: "4px 14px",
          borderRadius: "9999px",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#DC2626",
          fontSize: "11px",
          fontWeight: 800,
          textTransform: "uppercase",
          marginBottom: "10px",
          letterSpacing: "0.5px",
        }}
      >
        • AIMASTER SHORTS VIRAL STUDIO
      </div>

      {/* 3단계: 프로그램 한글명 볼드 메인 타이틀 & 서브 안내 카피 */}
      <h1 style={{ fontSize: "23px", fontWeight: 900, color: "#0F172A", marginBottom: "4px", letterSpacing: "-0.5px" }}>
        {APP_NAME_FULL} <span style={{ fontSize: "14px", color: "#DC2626", fontWeight: 800 }}>{APP_VERSION}</span>
      </h1>
      <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "22px" }}>
        AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
      </p>

      {/* 4단계: 로그인/회원가입 폼 카드 */}
      <div
        className="w-full rounded-2xl border border-zinc-200/90 bg-white p-7 shadow-[0_12px_32px_rgba(15,23,42,0.06)] text-left"
      >
        {/* 2단 탭 세그먼트 */}
        <div className="mb-5 flex rounded-xl bg-zinc-100/90 p-1 border border-zinc-200/60">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-extrabold transition-all duration-150 ${
              mode === "login"
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                : "text-zinc-500 hover:text-zinc-800"
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
            className={`flex-1 rounded-lg py-2 text-center text-xs font-extrabold transition-all duration-150 ${
              mode === "signup"
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-2.5 text-center text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {mode === "signup" ? (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-zinc-600 leading-relaxed">
              이 프로그램은 <b>AIMaster 통합 계정 및 구독 권한</b>으로 동작합니다.
              <br />
              AIMaster에서 회원가입 후 이 프로그램을 구독하시면 바로 이용할 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE_URL}/register`}
              className="btn-3d-yt-red w-full py-3 text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5"
            >
              AIMaster 회원가입 하러가기 <ArrowRight size={14} aria-hidden />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />
            <div>
              <label htmlFor="email" className="mb-1 flex items-center gap-1 text-[11px] font-bold text-zinc-700">
                <Mail size={12} className="text-red-500" /> 이메일 주소
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="buylifemall@gmail.com"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-2.5 px-3 text-xs text-zinc-900 placeholder-zinc-400 transition-all focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="flex items-center gap-1 text-[11px] font-bold text-zinc-700">
                  <Lock size={12} className="text-red-500" /> 비밀번호
                </label>
                <a href={`${MAIN_SITE_URL}/forgot-password`} className="text-[10px] text-zinc-400 hover:text-zinc-600 underline">
                  비밀번호 찾기?
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-2.5 px-3 text-xs text-zinc-900 placeholder-zinc-400 transition-all focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="btn-3d-yt-red w-full py-3 text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 mt-2"
            >
              {isPending ? "로그인 중..." : <>쇼츠 스튜디오 입장 <ArrowRight size={14} aria-hidden /></>}
            </button>
          </form>
        )}
      </div>

      {/* 5단계: 약관 문구 1행 축소 처리 (2026-11-01 필수 규격) */}
      <div style={{ marginTop: "20px", fontSize: "11px", color: "#94A3B8", whiteSpace: "nowrap" }}>
        진행 시 <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" style={{ color: "#DC2626", textDecoration: "underline" }}>이용약관</a> 및{" "}
        <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" style={{ color: "#DC2626", textDecoration: "underline" }}>개인정보 처리방침</a>에 동의합니다.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-xs text-zinc-400 py-12">로딩 중...</div>}>
      <LoginCard />
    </Suspense>
  );
}
