"use client";

// 2026-11-01 주인님 절대 지시: 5단계 표준 로그인 폼 규격 (81. 미니멀 블로거 인텔리전스 아틀리에 스타일)
import { useState } from "react";
import { Lock, Mail, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, MAIN_SITE } from "@/lib/version";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "signup") {
      window.location.assign(`${MAIN_SITE}/signup`);
      return;
    }

    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    try {
      const { error: authError } = await createClient().auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError("이메일 또는 비밀번호를 다시 확인해 주세요.");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "440px", margin: "0 auto", textAlign: "center" }}>
      {/* 1. [맨 위] 프로그램 고유 로고 (64~68px 라운드 스퀘어 아이콘) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "18px",
            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 25px -4px rgba(16, 185, 129, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <Search size={34} strokeWidth={2.4} />
        </div>
      </div>

      {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
        <span
          style={{
            borderRadius: "999px",
            background: "rgba(5, 150, 105, 0.1)",
            border: "1px solid rgba(5, 150, 105, 0.25)",
            padding: "4px 14px",
            fontSize: "11px",
            fontWeight: 850,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#059669",
          }}
        >
          AIMASTER BLOG KEYWORD
        </span>
      </div>

      {/* 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 */}
      <div style={{ marginBottom: "22px" }}>
        <h1 style={{ fontSize: "25px", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em" }}>
          {APP_NAME}
        </h1>
        <p style={{ marginTop: "5px", fontSize: "12.5px", fontWeight: 600, color: "#64748B" }}>
          AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
        </p>
      </div>

      {/* 4. [중앙] 로그인/회원가입 폼 카드 */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "20px",
          padding: "28px 24px",
          boxShadow: "0 10px 30px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)",
          textAlign: "left",
        }}
      >
        {/* 2단 탭 세그먼트 */}
        <div
          style={{
            display: "flex",
            background: "#F1F5F9",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "20px",
            border: "1px solid #E2E8F0",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            style={{
              flex: 1,
              borderRadius: "9px",
              padding: "8px 0",
              fontSize: "12.5px",
              fontWeight: 800,
              border: "none",
              background: mode === "login" ? "#FFFFFF" : "transparent",
              color: mode === "login" ? "#059669" : "#64748B",
              boxShadow: mode === "login" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            style={{
              flex: 1,
              borderRadius: "9px",
              padding: "8px 0",
              fontSize: "12.5px",
              fontWeight: 800,
              border: "none",
              background: mode === "signup" ? "#FFFFFF" : "transparent",
              color: mode === "signup" ? "#059669" : "#64748B",
              boxShadow: mode === "signup" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "16px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "#FFF1F2",
              border: "1px solid #FECDD3",
              color: "#E11D48",
              fontSize: "12.5px",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                이메일 주소
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94A3B8",
                    display: "flex",
                  }}
                >
                  <Mail size={17} />
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 40px",
                    borderRadius: "10px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    fontSize: "13.5px",
                    outline: "none",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", margin: 0 }}>
                  비밀번호
                </label>
                <a
                  href={`${MAIN_SITE}/forgot-password`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "11.5px", color: "#64748B", textDecoration: "underline", fontWeight: 600 }}
                >
                  비밀번호 찾기?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94A3B8",
                    display: "flex",
                  }}
                >
                  <Lock size={17} />
                </span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 40px",
                    borderRadius: "10px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    fontSize: "13.5px",
                    outline: "none",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
                  }}
                />
              </div>
            </div>

            {/* 3D 엠보싱 실행 버튼 (`로그인 →`) */}
            <button
              type="submit"
              disabled={pending}
              className="btn-3d-sage"
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "12px 18px",
                fontSize: "14px",
                minHeight: "46px",
              }}
            >
              {pending ? "로그인 중..." : "로그인 →"}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p style={{ fontSize: "13.5px", color: "#334155", lineHeight: 1.6, marginBottom: "16px" }}>
              AIMaster 통합 회원가입을 통해 하나의 계정으로 모든 AI 자동화 프로그램을 즉시 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE}/signup`}
              className="btn-3d-sage"
              style={{
                display: "inline-flex",
                width: "100%",
                justifyContent: "center",
                padding: "12px 18px",
                fontSize: "14px",
                minHeight: "46px",
                textDecoration: "none",
              }}
            >
              AIMaster 회원가입 페이지로 이동 →
            </a>
          </div>
        )}
      </div>

      {/* 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 준수) */}
      <div style={{ marginTop: "18px", whiteSpace: "nowrap", textAlign: "center" }}>
        <p style={{ fontSize: "11.5px", color: "#64748B" }}>
          진행 시{" "}
          <a
            href={`${MAIN_SITE}/terms`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#0F172A", textDecoration: "underline", fontWeight: 700 }}
          >
            이용약관
          </a>
          {" 및 "}
          <a
            href={`${MAIN_SITE}/privacy`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#0F172A", textDecoration: "underline", fontWeight: 700 }}
          >
            개인정보 처리방침
          </a>
          에 동의합니다.
        </p>
      </div>
    </div>
  );
}
