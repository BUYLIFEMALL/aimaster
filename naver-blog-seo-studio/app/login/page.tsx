import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="eyebrow">AIMaster account</div>
        <h1>네이버 블로그<br />SEO 스튜디오</h1>
        <p className="lede">AIMaster에서 가입한 계정으로 로그인합니다.</p>
        <Suspense fallback={<p className="card-caption">로그인 화면을 준비하고 있습니다.</p>}><LoginForm /></Suspense>
        <p className="login-help">회원가입과 구독 관리는 <a href="https://www.buylife.xyz/login" target="_blank" rel="noreferrer">AIMaster</a>에서 진행합니다.</p>
      </section>
    </main>
  );
}
