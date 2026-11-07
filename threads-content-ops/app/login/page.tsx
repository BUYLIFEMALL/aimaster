import { brandTitle } from "@/threads-content-ops/lib/deployment";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: brandTitle("로그인 · Threads 콘텐츠 운영 자동화") };

export default function LoginPage({ searchParams }: { searchParams: { redirect?: string; confirmed?: string } }) {
  const next = searchParams.redirect?.startsWith("/") ? searchParams.redirect : "/threads-content-ops";
  return <LoginForm next={next} confirmed={searchParams.confirmed === "1"} />;
}
