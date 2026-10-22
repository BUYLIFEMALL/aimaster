"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAIN_SITE, APP_NAME } from "@/lib/version";
import { hasStashedRefHandoff, stashRefHandoff } from "@/lib/refHandoff";

export function LoginForm() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // v1.33 다른 프로그램이 넘긴 대사가 주소 # 뒤에 있으면 보관(로그인 뒤 주제 화면에서 꺼냄)
  useEffect(() => {
    if (stashRefHandoff(window.location.hash)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      if (error) {
        setError("이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }
      window.location.assign(hasStashedRefHandoff() ? "/topic" : "/dashboard");
    } catch {
      setError("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "440px", margin: "0 auto" }}>
      {/* 2탭 세그먼트 토글 바 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
          backgroundColor: "rgba(15, 22, 38, 0.8)",
          padding: "4px",
          borderRadius: "14px",
          border: "1px solid rgba(51, 65, 85, 0.6)",
          marginBottom: "24px",
        }}
      >
        <button
          type="button"
          onClick={() => { setActiveTab("login"); setError(""); }}
          style={{
            padding: "9px 0",
            fontSize: "13px",
            fontWeight: activeTab === "login" ? 700 : 500,
            borderRadius: "10px",
            border: activeTab === "login" ? "none" : "1px solid transparent",
            backgroundColor: activeTab === "login" ? "#e11d48" : "transparent",
            backgroundImage: activeTab === "login" ? "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)" : "none",
            color: activeTab === "login" ? "#ffffff" : "#94a3b8",
            cursor: "pointer",
            boxShadow: activeTab === "login" ? "0 0 16px rgba(225, 29, 72, 0.45)" : "none",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("signup"); setError(""); }}
          style={{
            padding: "9px 0",
            fontSize: "13px",
            fontWeight: activeTab === "signup" ? 700 : 500,
            borderRadius: "10px",
            border: activeTab === "signup" ? "none" : "1px solid transparent",
            backgroundColor: activeTab === "signup" ? "#e11d48" : "transparent",
            backgroundImage: activeTab === "signup" ? "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)" : "none",
            color: activeTab === "signup" ? "#ffffff" : "#94a3b8",
            cursor: "pointer",
            boxShadow: activeTab === "signup" ? "0 0 16px rgba(225, 29, 72, 0.45)" : "none",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          회원가입
        </button>
      </div>

      {activeTab === "login" ? (
        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* 이메일 필드 */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#e2e8f0",
                marginBottom: "6px",
              }}
            >
              이메일
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  color: "#64748b",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  paddingLeft: "42px",
                  paddingRight: "14px",
                  paddingTop: "11px",
                  paddingBottom: "11px",
                  fontSize: "13px",
                  backgroundColor: "rgba(15, 22, 38, 0.85)",
                  color: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid rgba(51, 65, 85, 0.8)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                }}
              />
            </div>
          </div>

          {/* 비밀번호 필드 */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#e2e8f0",
                }}
              >
                비밀번호
              </label>
              <a
                href={`${MAIN_SITE}/forgot-password`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#fb7185",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
              >
                비밀번호 찾기?
              </a>
            </div>
            <div style={{ position: "relative", width: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  color: "#64748b",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  paddingLeft: "42px",
                  paddingRight: "14px",
                  paddingTop: "11px",
                  paddingBottom: "11px",
                  fontSize: "13px",
                  backgroundColor: "rgba(15, 22, 38, 0.85)",
                  color: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid rgba(51, 65, 85, 0.8)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                }}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                fontSize: "12px",
                color: "#f87171",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "10px 14px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={pending}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#ffffff",
              backgroundColor: "#e11d48",
              backgroundImage: "linear-gradient(135deg, #fb7185 0%, #e11d48 50%, #9333ea 100%)",
              border: "none",
              borderRadius: "12px",
              cursor: pending ? "not-allowed" : "pointer",
              boxShadow: "0 0 20px rgba(225, 29, 72, 0.4)",
              opacity: pending ? 0.7 : 1,
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            {pending ? (
              <>
                <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                <span>로그인 중…</span>
              </>
            ) : (
              <span>로그인</span>
            )}
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* 회원가입 안내 박스 */}
          <div
            style={{
              padding: "18px",
              backgroundColor: "rgba(225, 29, 72, 0.08)",
              border: "1px solid rgba(251, 113, 133, 0.3)",
              borderRadius: "14px",
              color: "#ffe4e6",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "16px" }}>⚡</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#fb7185" }}>
                통합 계정 회원가입 안내
              </span>
            </div>
            <p style={{ fontSize: "12px", lineHeight: "1.6", color: "#cbd5e1", margin: 0 }}>
              {APP_NAME}는 <strong>AIMaster</strong>의 공식 숏폼 영상 제작 프로그램입니다. 회원가입과 이용권(구독) 권한은 AIMaster 메인 플랫폼에서 안전하게 통합 관리됩니다.
            </p>
          </div>

          <a
            href={`${MAIN_SITE}/signup`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#ffffff",
              backgroundColor: "#e11d48",
              backgroundImage: "linear-gradient(135deg, #fb7185 0%, #e11d48 50%, #9333ea 100%)",
              borderRadius: "12px",
              textDecoration: "none",
              boxShadow: "0 0 20px rgba(225, 29, 72, 0.4)",
              boxSizing: "border-box",
              transition: "all 0.2s ease",
            }}
          >
            <span>AIMaster에서 무료 회원가입하기</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>

          <div style={{ textAlign: "center", marginTop: "4px" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>이미 계정이 있으신가요? </span>
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "12px",
                fontWeight: 600,
                color: "#fb7185",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              로그인 탭으로 이동
            </button>
          </div>
        </div>
      )}

      {/* 하단 푸터 (약관 및 저작권) */}
      <div
        style={{
          marginTop: "24px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(51, 65, 85, 0.4)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px" }}>
          <a
            href={`${MAIN_SITE}/terms`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "11px", color: "#64748b", textDecoration: "none" }}
          >
            이용약관
          </a>
          <span style={{ fontSize: "10px", color: "#334155" }}>•</span>
          <a
            href={`${MAIN_SITE}/privacy`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "11px", color: "#64748b", textDecoration: "none" }}
          >
            개인정보처리방침
          </a>
        </div>
      </div>
    </div>
  );
}
