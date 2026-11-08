import { redirect } from "next/navigation";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LoginPage() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/open");

  return (
    <main
      className="welcome"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, #FAF8F5 0%, #EFE9E0 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#FFFFFF",
          border: "2px solid #E5DFD7",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 20px 40px rgba(74, 55, 40, 0.08), 0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* 1단계: 프로그램 고유 로고 (64px 라운드 스퀘어 심볼) */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #FDE047 0%, #EAB308 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "30px",
            boxShadow: "0 8px 20px rgba(234, 179, 8, 0.35)",
            border: "2px solid #1C1917",
            marginBottom: "14px",
          }}
        >
          🍌
        </div>

        {/* 2단계: 프로그램 영문명 (알약 캡슐 뱃지) */}
        <div
          style={{
            padding: "4px 14px",
            borderRadius: "9999px",
            background: "rgba(234, 179, 8, 0.15)",
            border: "1px solid rgba(234, 179, 8, 0.5)",
            color: "#A16207",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            marginBottom: "10px",
            letterSpacing: "0.5px",
          }}
        >
          • AIMASTER BANANA CANVAS
        </div>

        {/* 3단계: 프로그램 한글명 볼드 메인 타이틀 & 서브 안내 카피 */}
        <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#1C1917", marginBottom: "4px", letterSpacing: "-0.5px" }}>
          {APP_NAME} <span style={{ fontSize: "14px", color: "#CA8A04", fontWeight: 800 }}>{APP_VERSION}</span>
        </h1>
        <p style={{ fontSize: "13px", color: "#78716C", marginBottom: "22px" }}>
          AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
        </p>

        {/* 4단계: 로그인/회원가입 폼 카드 */}
        <LoginForm />

        {/* 5단계: 약관 문구 1행 축소 처리 (2026-11-01 필수 규격) */}
        <div style={{ marginTop: "20px", fontSize: "11px", color: "#A8A29E", whiteSpace: "nowrap" }}>
          진행 시 <a href="/terms" style={{ color: "#CA8A04", textDecoration: "underline" }}>이용약관</a> 및{" "}
          <a href="/privacy" style={{ color: "#CA8A04", textDecoration: "underline" }}>개인정보 처리방침</a>에 동의합니다.
        </div>
      </div>
    </main>
  );
}
