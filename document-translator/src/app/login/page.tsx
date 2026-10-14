import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { APP_NAME, MAIN_SITE } from "@/lib/version";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/dashboard");
  return (
    <main className="auth-page">
      <section className="card">
        <h1>{APP_NAME}</h1>
        <p>AIMaster 회원 계정으로 로그인해주세요.</p>
        <LoginForm />
        <a href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </section>
    </main>
  );
}
