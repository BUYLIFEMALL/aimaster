import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LoginPage() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/style");

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        backgroundColor: "#faf8f5",
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.08) 0%, transparent 60%),
          radial-gradient(circle at 85% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 50%),
          linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 100% 100%, 24px 24px, 24px 24px",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#ffffff",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          borderRadius: "24px",
          padding: "36px 30px 28px",
          boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.02)",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* 상단 브랜드 헤더 */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          {/* 블로그 펜/에디터 심볼 */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #eef2ff, #c7d2fe)",
              border: "1px solid #c7d2fe",
              color: "#4f46e5",
              marginBottom: "14px",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.15)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
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
                color: "#4f46e5",
                backgroundColor: "rgba(79, 70, 229, 0.06)",
                border: "1px solid rgba(79, 70, 229, 0.25)",
                borderRadius: "9999px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: "10px",
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
              color: "#0f172a",
              margin: "0 0 8px 0",
              letterSpacing: "-0.03em",
            }}
          >
            {APP_NAME}
          </h1>

          {/* 서브 문구 */}
          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            전문 블로그 콘텐츠 기획 및 멀티 템플릿 제작 스튜디오
          </p>
        </div>

        {/* 2탭 폼 컴포넌트 */}
        <LoginForm />
      </div>
    </main>
  );
}
