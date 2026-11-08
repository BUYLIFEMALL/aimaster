import { redirect } from "next/navigation";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LoginPage() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/studio");

  return (
    <main className="welcome" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at center, #181B20 0%, #0E1013 100%)", padding: "24px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#181B20",
          border: "1px solid #262B33",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
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
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "30px",
            boxShadow: "0 8px 20px rgba(245, 158, 11, 0.35)",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            marginBottom: "14px",
          }}
        >
          📸
        </div>

        {/* 2단계: 프로그램 영문명 (알약 캡슐 뱃지) */}
        <div
          style={{
            padding: "4px 14px",
            borderRadius: "9999px",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            color: "#F59E0B",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            marginBottom: "10px",
            letterSpacing: "0.5px",
          }}
        >
          • AIMASTER PORTRAIT PHOTO STUDIO
        </div>

        {/* 3단계: 프로그램 한글명 볼드 메인 타이틀 & 서브 안내 카피 */}
        <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#FFFFFF", marginBottom: "4px", letterSpacing: "-0.5px" }}>
          {APP_NAME} <span style={{ fontSize: "14px", color: "#F59E0B", fontWeight: 800 }}>{APP_VERSION}</span>
        </h1>
        <p style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "22px" }}>
          AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
        </p>

        {/* 4단계: 로그인/회원가입 폼 카드 */}
        <LoginForm />

        {/* 5단계: 약관 문구 1행 축소 처리 (필수 규격) */}
        <div style={{ marginTop: "20px", fontSize: "11px", color: "#64748B", whiteSpace: "nowrap" }}>
          진행 시 <a href="/terms" style={{ color: "#94A3B8", textDecoration: "underline" }}>이용약관</a> 및{" "}
          <a href="/privacy" style={{ color: "#94A3B8", textDecoration: "underline" }}>개인정보 처리방침</a>에 동의합니다.
        </div>
      </div>
    </main>
  );
}
