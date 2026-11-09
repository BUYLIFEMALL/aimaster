import { redirect } from "next/navigation";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Page() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/dashboard");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: "radial-gradient(circle at 50% 20%, #151D30 0%, #070A12 70%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px", textAlign: "center" }}>
        {/* 1. [맨 위] 프로그램 고유 로고 (64~68px 라운드 스퀘어 심볼 아이콘) */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              fontSize: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(16, 185, 129, 0.35)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
            }}
          >
            ⏱️
          </div>
        </div>

        {/* 2. [그 밑] 프로그램 영문명 (알약 캡슐 뱃지) */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
          <span
            style={{
              borderRadius: "9999px",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              background: "rgba(16, 185, 129, 0.12)",
              padding: "4px 14px",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "#34D399",
            }}
          >
            AIMASTER AI TASK PLANNER
          </span>
        </div>

        {/* 3. [그 밑] 프로그램 한글명 + 서브 안내 카피 */}
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 900,
              letterSpacing: "-0.5px",
              color: "#FFFFFF",
              margin: "0 0 6px",
            }}
          >
            {APP_NAME} 플래너
          </h1>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#94A3B8",
              margin: 0,
            }}
          >
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>

        {/* 4 & 5. [중앙] 폼 카드 + [맨 아래] 1행 약관 문구 */}
        <LoginForm />
      </div>
    </main>
  );
}
