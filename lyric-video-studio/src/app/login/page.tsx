import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LoginPage() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/dashboard");

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        backgroundColor: "#0b1020",
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(225, 29, 72, 0.15) 0%, transparent 60%),
          radial-gradient(circle at 85% 20%, rgba(147, 51, 234, 0.12) 0%, transparent 50%),
          radial-gradient(circle at 15% 85%, rgba(225, 29, 72, 0.08) 0%, transparent 45%),
          linear-gradient(rgba(251, 113, 133, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(251, 113, 133, 0.035) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 100% 100%, 100% 100%, 24px 24px, 24px 24px",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "rgba(20, 27, 45, 0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(251, 113, 133, 0.25)",
          borderRadius: "24px",
          padding: "36px 30px 28px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(225, 29, 72, 0.1)",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* 상단 브랜드 헤더 */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          {/* 가사영상 음표 심볼 */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #fb7185, #e11d48 55%, #9333ea)",
              color: "#ffffff",
              marginBottom: "14px",
              boxShadow: "0 0 20px rgba(225, 29, 72, 0.35)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 8-6 4 6 4V8Z" />
              <rect width="14" height="12" x="2" y="6" rx="2" />
            </svg>
          </div>

          {/* 통합 계정 뱃지 */}
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#fb7185",
                backgroundColor: "rgba(251, 113, 133, 0.08)",
                border: "1px solid rgba(251, 113, 133, 0.28)",
                borderRadius: "9999px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: "10px",
                boxShadow: "0 0 10px rgba(225, 29, 72, 0.15)",
              }}
            >
              AIMaster 통합 계정
            </span>
          </div>

          {/* 대형 타이틀 */}
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 8px 0",
              letterSpacing: "-0.03em",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            }}
          >
            {APP_NAME}
          </h1>

          {/* 서브 문구 */}
          <p
            style={{
              fontSize: "13px",
              color: "#94a3b8",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            원클릭 AI 숏폼 영상 제작 파이프라인 스튜디오
          </p>
        </div>

        {/* 2탭 폼 컴포넌트 */}
        <LoginForm />
      </div>
    </main>
  );
}
