import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function safeRedirect(value: string | undefined): string {
  return value && /^\/(?![/\\])/.test(value) && !value.startsWith("/login") ? value : "/";
}

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const next = safeRedirect((await searchParams).redirect);
  if (await getUser()) redirect(next);
  return (
    <main className="aww-login">
      <div className="aww-login-wrap">
        <header className="aww-login-head">
          <div className="aww-login-badge-icon" aria-hidden>
            🏢
          </div>
          <span className="aww-login-eyebrow">AIMaster Smart Office</span>
          <h1>{APP_NAME}</h1>
          <p>AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </header>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
