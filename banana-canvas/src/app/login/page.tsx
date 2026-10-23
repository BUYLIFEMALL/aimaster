import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function LoginPage() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/open");
  // v1.21 공식 로그인 탭 레이아웃(격자 바탕·중앙 440px·로고·안내 문구 → 탭 카드)
  return (
    <main className="auth-page">
      <div className="auth-wrap">
        <div className="auth-head">
          <span className="brand-icon auth-logo" aria-hidden>🍌</span>
          <h1>{APP_NAME}</h1>
          <p>AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
