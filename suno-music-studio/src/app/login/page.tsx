import { signInAction } from "@/lib/actions/auth";
import { LoginForm } from "@/components/LoginForm";
import { APP_NAME } from "@/lib/version";
import { Music2 } from "lucide-react";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="card login-card">
        <Music2 className="brand-icon" />
        <h1>{APP_NAME}</h1>
        <p className="muted">AIMaster 계정으로 로그인하세요.</p>
        <LoginForm action={signInAction} />
        <p>
          <a href="https://www.buylife.xyz/register">AIMaster 회원가입 ↗</a>
        </p>
        <a href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a>
      </section>
    </main>
  );
}
