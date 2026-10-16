import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LoginPage() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/player");

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        backgroundColor: "#060911",
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 85% 20%, rgba(121, 40, 202, 0.12) 0%, transparent 50%),
          radial-gradient(circle at 15% 85%, rgba(0, 242, 254, 0.06) 0%, transparent 45%),
          linear-gradient(rgba(56, 189, 248, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56, 189, 248, 0.035) 1px, transparent 1px)
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
          backgroundColor: "rgba(13, 19, 33, 0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "24px",
          padding: "36px 30px 28px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 242, 254, 0.08)",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* 상단 브랜드 헤더 */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          {/* 하이파이 헤드폰 네온 심볼 */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(121, 40, 202, 0.25) 100%)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              color: "#00f2fe",
              marginBottom: "14px",
              boxShadow: "0 0 20px rgba(0, 242, 254, 0.25)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
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
                color: "#00f2fe",
                backgroundColor: "rgba(0, 242, 254, 0.08)",
                border: "1px solid rgba(0, 242, 254, 0.28)",
                borderRadius: "9999px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: "10px",
                boxShadow: "0 0 10px rgba(0, 242, 254, 0.15)",
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
            고음질 오디오 감상 및 스마트 사운드 스튜디오
          </p>
        </div>

        {/* 2탭 폼 컴포넌트 */}
        <LoginForm />
      </div>
    </main>
  );
}
