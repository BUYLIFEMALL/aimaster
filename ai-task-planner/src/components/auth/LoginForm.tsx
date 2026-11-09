"use client";

// 2026-11-01 주인님 절대 지침: 5단계 표준 로그인 폼 규격 (74. 퀀트 타임트래커 다크 터미널 테마)
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAIN_SITE, APP_NAME } from "@/lib/version";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
      window.location.assign("/dashboard");
    } catch {
      setError("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "440px", margin: "0 auto" }}>
      {/* 4. [중앙] 로그인/회원가입 폼 카드 */}
      <div
        style={{
          background: "#0F1523",
          border: "1px solid #1E293B",
          borderRadius: "18px",
          padding: "32px 28px",
          boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
          textAlign: "left",
        }}
      >
        {/* 2단 탭 세그먼트 */}
        <div
          style={{
            display: "flex",
            background: "#151D30",
            border: "1px solid #1E293B",
            borderRadius: "10px",
            padding: "4px",
            marginBottom: "22px",
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
              padding: "8px 0",
              borderRadius: "8px",
              background: mode === "login" ? "#0F1523" : "transparent",
              color: mode === "login" ? "#10B981" : "#94A3B8",
              fontWeight: mode === "login" ? 800 : 600,
              fontSize: "13px",
              border: mode === "login" ? "1px solid #1E293B" : "none",
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: mode === "login" ? "0 2px 6px rgba(0,0,0,0.2)" : "none",
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
              padding: "8px 0",
              borderRadius: "8px",
              background: mode === "signup" ? "#0F1523" : "transparent",
              color: mode === "signup" ? "#10B981" : "#94A3B8",
              fontWeight: mode === "signup" ? 800 : 600,
              fontSize: "13px",
              border: mode === "signup" ? "1px solid #1E293B" : "none",
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: mode === "signup" ? "0 2px 6px rgba(0,0,0,0.2)" : "none",
            }}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#F43F5E",
              borderRadius: "9px",
              padding: "10px 14px",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={login} className="stack" style={{ gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#94A3B8",
                  marginBottom: "6px",
                }}
              >
                이메일 주소
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748B",
                    fontSize: "14px",
                  }}
                >
                  ✉️
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="buylifemall@gmail.com"
                  style={{
                    paddingLeft: "36px",
                    background: "#151D30",
                    border: "1px solid #1E293B",
                    color: "#F8FAFC",
                    fontSize: "13px",
                    borderRadius: "9px",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#94A3B8",
                  marginBottom: "6px",
                }}
              >
                비밀번호
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748B",
                    fontSize: "14px",
                  }}
                >
                  🔒
                </span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  style={{
                    paddingLeft: "36px",
                    background: "#151D30",
                    border: "1px solid #1E293B",
                    color: "#F8FAFC",
                    fontSize: "13px",
                    borderRadius: "9px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                margin: "2px 0 6px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#94A3B8",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ width: "auto", margin: 0, accentColor: "#10B981" }}
                />
                로그인 유지
              </label>
              <a
                href={`${MAIN_SITE}/forgot-password`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#10B981",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                비밀번호 찾기?
              </a>
            </div>

            {/* 하단 입체 섀도우의 3D 엠보싱 실행 버튼 */}
            <button
              type="submit"
              className="btn-3d-emerald"
              disabled={pending}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "15px",
                fontWeight: 900,
                marginTop: "6px",
              }}
            >
              {pending ? "로그인 중…" : "로그인 시작 →"}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <p
              style={{
                fontSize: "13px",
                color: "#94A3B8",
                lineHeight: "1.6",
                marginBottom: "20px",
              }}
            >
              {APP_NAME}은 AIMaster 통합 계정과 멤버십 구독 권한으로 구동됩니다.
              <br />
              메인 플랫폼에서 회원가입 후 즉시 이용하실 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE}/signup`}
              target="_blank"
              rel="noreferrer"
              className="btn-3d-emerald"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 900,
                display: "inline-flex",
                justifyContent: "center",
              }}
            >
              AIMaster 통합 회원가입 페이지로 이동 →
            </a>
          </div>
        )}
      </div>

      {/* 5. [맨 아래] 약관 문구 1행 축소 처리 (필수 규격) */}
      <div
        style={{
          marginTop: "18px",
          textAlign: "center",
          fontSize: "11px",
          color: "#64748B",
          whiteSpace: "nowrap",
        }}
      >
        진행 시{" "}
        <a
          href={`${MAIN_SITE}/terms`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#94A3B8", textDecoration: "underline" }}
        >
          이용약관
        </a>
        {" 및 "}
        <a
          href={`${MAIN_SITE}/privacy`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#94A3B8", textDecoration: "underline" }}
        >
          개인정보 처리방침
        </a>
        에 동의합니다.
      </div>
    </div>
  );
}
