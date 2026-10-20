import { redirect } from "next/navigation";
import { IS_STANDALONE, brandTitle } from "@/threads-content-ops/lib/deployment";
import { MAIN_SITE_ORIGIN, THREADS_CONTENT_OPS_ORIGIN } from "@/threads-content-ops/lib/oauth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: brandTitle("로그인 · Threads 콘텐츠 운영 자동화") };

// 2026-10-18: 독립 운영 모드(강의용 설치 키트)의 자체 로그인·가입 화면.
// AIMaster 운영에서는 가입·로그인을 메인 사이트가 맡으므로 그쪽으로 보낸다(로그아웃 후 /login 404였던 문제도 함께 해결).
export default function LoginPage({ searchParams }: { searchParams: { redirect?: string; confirmed?: string } }) {
  const next = searchParams.redirect?.startsWith("/") ? searchParams.redirect : "/threads-content-ops";
  if (!IS_STANDALONE) {
    redirect(`${MAIN_SITE_ORIGIN}/login?redirect=${encodeURIComponent(THREADS_CONTENT_OPS_ORIGIN + next)}`);
  }
  return <LoginForm next={next} confirmed={searchParams.confirmed === "1"} />;
}
