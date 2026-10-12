import { signInAction } from "@/lib/actions/auth";
import { LoginForm } from "@/components/LoginForm";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="card login-card">
        <h1>🌸 감성 글귀 이미지</h1>
        <p>AIMaster 계정으로 로그인하세요.</p>
        <LoginForm action={signInAction} />
        <p>
          <a href="https://www.buylife.xyz/register">AIMaster 회원가입 ↗</a>
        </p>
        <a href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a>
      </div>
    </main>
  );
}
