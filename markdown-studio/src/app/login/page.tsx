"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, MAIN_SITE } from "@/lib/version";

// v1.15: 색은 CSS 변수(--lg-*)로 — 밝은 화면은 기존 색 그대로, 다크 모드는 globals.css에서 바꾼다
function LoginCard() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim();
    const password = String(formData.get("password"));

    try {
      const { error: authError } = await createClient().auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }

      window.location.assign(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    } catch {
      setError("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid var(--lg-line, #e4e4e7)",
        backgroundColor: "var(--lg-card, #ffffff)",
        padding: "32px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
      }}
    >
      {/* 상단 탭 토글 바 */}
      <div
        style={{
          display: "flex",
          borderRadius: "12px",
          backgroundColor: "var(--lg-tabbar, #eef2ff)",
          padding: "4px",
          marginBottom: "24px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          style={{
            flex: 1,
            borderRadius: "8px",
            padding: "10px 0",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            border: "none",
            backgroundColor: mode === "login" ? "#4f46e5" : "transparent",
            color: mode === "login" ? "#ffffff" : "var(--lg-text-2, #475569)",
            boxShadow: mode === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          style={{
            flex: 1,
            borderRadius: "8px",
            padding: "10px 0",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            border: "none",
            backgroundColor: mode === "signup" ? "#4f46e5" : "transparent",
            color: mode === "signup" ? "#ffffff" : "var(--lg-text-2, #475569)",
            boxShadow: mode === "signup" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          회원가입
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "16px",
            borderRadius: "8px",
            border: "1px solid var(--lg-err-line, #fee2e2)",
            backgroundColor: "var(--lg-err-bg, #fef2f2)",
            padding: "12px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--lg-err, #dc2626)",
          }}
        >
          {error}
        </div>
      )}

      {mode === "signup" ? (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--lg-text-2, #475569)", margin: "10px 0" }}>
            이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
            <br />
            AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE}/register`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              width: "100%",
              borderRadius: "12px",
              backgroundColor: "#4f46e5",
              padding: "12px 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "#ffffff",
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              textAlign: "center",
              transition: "background-color 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#4338ca")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#4f46e5")}
          >
            AIMaster 회원가입 하러가기
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--lg-text, #334155)", marginBottom: "6px" }}
            >
              이메일 주소
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "12px",
                  display: "flex",
                  alignItems: "center",
                  color: "#94a3b8",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  style={{ width: "18px", height: "18px" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="developer@example.com"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: "12px",
                  border: "1px solid var(--lg-input-line, #e2e8f0)",
                  backgroundColor: "var(--lg-input, #f8fafc)",
                  padding: "12px 14px 12px 42px",
                  fontSize: "14px",
                  color: "var(--lg-input-text, #1e293b)",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#4f46e5";
                  e.currentTarget.style.backgroundColor = "var(--lg-input-focus, #ffffff)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--lg-input-line, #e2e8f0)";
                  e.currentTarget.style.backgroundColor = "var(--lg-input, #f8fafc)";
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label htmlFor="password" style={{ fontSize: "12px", fontWeight: 600, color: "var(--lg-text, #334155)" }}>
                비밀번호
              </label>
              <a
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  setError("비밀번호 재설정 기능은 준비 중입니다. 관리자에게 문의해주세요.");
                }}
                style={{ fontSize: "12px", fontWeight: 600, color: "var(--lg-link, #4f46e5)", textDecoration: "none" }}
                onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                비밀번호 찾기?
              </a>
            </div>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "12px",
                  display: "flex",
                  alignItems: "center",
                  color: "#94a3b8",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  style={{ width: "18px", height: "18px" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: "12px",
                  border: "1px solid var(--lg-input-line, #e2e8f0)",
                  backgroundColor: "var(--lg-input, #f8fafc)",
                  padding: "12px 14px 12px 42px",
                  fontSize: "14px",
                  color: "var(--lg-input-text, #1e293b)",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#4f46e5";
                  e.currentTarget.style.backgroundColor = "var(--lg-input-focus, #ffffff)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--lg-input-line, #e2e8f0)";
                  e.currentTarget.style.backgroundColor = "var(--lg-input, #f8fafc)";
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              borderRadius: "12px",
              backgroundColor: isPending ? "#818cf8" : "#4f46e5",
              padding: "13px 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "#ffffff",
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(79, 70, 229, 0.2)",
              transition: "background-color 0.2s ease",
            }}
            onMouseOver={(e) => {
              if (!isPending) e.currentTarget.style.backgroundColor = "#4338ca";
            }}
            onMouseOut={(e) => {
              if (!isPending) e.currentTarget.style.backgroundColor = "#4f46e5";
            }}
          >
            {isPending ? (
              <span
                style={{
                  display: "inline-block",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: "2px solid #ffffff",
                  borderTopColor: "transparent",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <>
                로그인
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  style={{ width: "16px", height: "16px" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      )}

      {/* 하단 약관 푸터 */}
      <p
        style={{
          marginTop: "32px",
          textAlign: "center",
          fontSize: "11px",
          lineHeight: "1.6",
          letterSpacing: "0.01em",
          color: "#94a3b8",
        }}
      >
        계속 진행함으로써 귀하는 당사의{" "}
        <a
          href={`${MAIN_SITE}/terms`}
          target="_blank"
          rel="noreferrer"
          style={{ fontWeight: 500, color: "var(--lg-text-2, #475569)", textDecoration: "underline" }}
        >
          이용약관
        </a>{" "}
        및{" "}
        <a
          href={`${MAIN_SITE}/privacy`}
          target="_blank"
          rel="noreferrer"
          style={{ fontWeight: 500, color: "var(--lg-text-2, #475569)", textDecoration: "underline" }}
        >
          개인정보 처리방침
        </a>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        backgroundColor: "var(--lg-page, #faf8f5)",
        backgroundImage:
          "linear-gradient(to right, rgba(79, 70, 229, 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(79, 70, 229, 0.035) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, var(--lg-page-edge, #f3efe8) 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* 상단 브랜드 헤더 */}
        <div style={{ marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div
            style={{
              marginBottom: "12px",
              display: "inline-flex",
              height: "48px",
              width: "48px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.25)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              style={{ width: "24px", height: "24px" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <h1
            style={{
              margin: "0 0 6px 0",
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--lg-link, #4f46e5)",
            }}
          >
            {APP_NAME}
          </h1>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: "var(--lg-muted, #64748b)" }}>
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>

        <Suspense fallback={<div style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>로딩 중...</div>}>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
