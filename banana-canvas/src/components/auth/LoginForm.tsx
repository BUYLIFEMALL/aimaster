"use client";
import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAIN_SITE } from "@/lib/version";

export function LoginForm() {
  const [tab, setTab] = useState<"login" | "signup">("login");
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
      window.location.assign("/open");
    } catch {
      setError("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>
      {/* 2단 탭 세그먼트 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "#F5F2EB",
          borderRadius: "10px",
          padding: "4px",
          border: "1.5px solid #E5DFD7",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          onClick={() => setTab("login")}
          style={{
            background: tab === "login" ? "#FFFFFF" : "transparent",
            color: tab === "login" ? "#1C1917" : "#78716C",
            border: tab === "login" ? "1.5px solid #1C1917" : "none",
            boxShadow: tab === "login" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
            padding: "8px",
            borderRadius: "7px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setTab("signup")}
          style={{
            background: tab === "signup" ? "#FFFFFF" : "transparent",
            color: tab === "signup" ? "#1C1917" : "#78716C",
            border: tab === "signup" ? "1.5px solid #1C1917" : "none",
            boxShadow: tab === "signup" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
            padding: "8px",
            borderRadius: "7px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          회원가입
        </button>
      </div>

      {tab === "login" ? (
        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ textAlign: "left" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#44403C", marginBottom: "4px" }}>
              <Mail size={12} color="#CA8A04" /> 이메일 주소
            </label>
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="buylifemall@gmail.com"
              required
              style={{
                width: "100%",
                background: "#FAF8F5",
                border: "1.5px solid #D6CEBE",
                color: "#1C1917",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#44403C" }}>
                <Lock size={12} color="#CA8A04" /> 비밀번호
              </label>
              <a href={`${MAIN_SITE}/forgot-password`} style={{ fontSize: "10px", color: "#78716C", textDecoration: "underline" }}>
                비밀번호 찾기?
              </a>
            </div>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              required
              style={{
                width: "100%",
                background: "#FAF8F5",
                border: "1.5px solid #D6CEBE",
                color: "#1C1917",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: "#DC2626", fontSize: "12px", textAlign: "left", margin: "2px 0" }}>
              {error}
            </p>
          )}

          {/* 3D 엠보싱 팝 버튼 */}
          <button
            type="submit"
            disabled={pending}
            className="btn-3d btn-3d-pop"
            style={{ width: "100%", height: "46px", fontSize: "14px", marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            {pending ? "캔버스 입장 중…" : <>아뜰리에 캔버스 입장 <ArrowRight size={16} aria-hidden /></>}
          </button>
        </form>
      ) : (
        <div style={{ padding: "16px", background: "#FAF8F5", borderRadius: "10px", border: "1.5px solid #E5DFD7", textAlign: "left" }}>
          <p style={{ fontSize: "12px", color: "#57534E", lineHeight: 1.6, marginBottom: "14px" }}>
            이 프로그램은 <b>AIMaster 통합 계정 및 구독 권한</b>으로 동작합니다. AIMaster 메인 사이트에서 가입 후 이용하실 수 있습니다.
          </p>
          <a
            href={`${MAIN_SITE}/signup`}
            className="btn-3d btn-3d-pop"
            style={{ width: "100%", height: "42px", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            AIMaster 회원가입 이동 <ArrowRight size={16} aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}
