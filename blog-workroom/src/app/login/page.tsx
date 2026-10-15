import { redirect } from "next/navigation";
import { APP_NAME, MAIN_SITE } from "@/lib/version";
import { getUser } from "@/lib/auth";
import { platformConfigured } from "@/lib/config";
import { LoginForm } from "@/components/auth/LoginForm";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function LoginPage() {
  if (!platformConfigured()) redirect("/setup");
  if (await getUser()) redirect("/style");
  return <main className="welcome"><div className="card max-w-md"><p className="eyebrow">AIMaster 통합 계정</p><h1>{APP_NAME}</h1><p>기존 AIMaster 계정으로 로그인하세요.</p><LoginForm/><a href={`${MAIN_SITE}/signup`} className="subtle-link">회원가입은 AIMaster에서 진행합니다.</a></div></main>;
}
