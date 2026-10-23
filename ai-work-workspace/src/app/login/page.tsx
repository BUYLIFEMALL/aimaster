import { redirect } from "next/navigation";
import { APP_NAME, MAIN_SITE } from "@/lib/version";
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
      <section className="aww-login-card">
        <p className="eyebrow">AIMaster 통합 계정</p>
        <h1>{APP_NAME}</h1>
        <p>기존 AIMaster 계정으로 로그인해주세요.</p>
        <LoginForm next={next} />
        <a href={`${MAIN_SITE}/signup`}>회원가입은 AIMaster에서 진행합니다.</a>
      </section>
    </main>
  );
}
