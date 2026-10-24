import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 로그인·회원가입 화면 — DESIGN.md 14번·§5 표준 2탭 레이아웃(기준: threads-comment-reply/app/(auth)/layout.tsx).
// 24px 격자 배경 + 가운데 440px, 위에 프로그램 이름과 안내 문구. 색은 이 프로그램 라이트 테마(네이버 그린).
export default function LoginPage() {
  return (
    <main className="auth-shell">
      <div className="auth-wrap">
        <div className="auth-head">
          <span className="auth-logo" aria-hidden="true">🏠</span>
          <h1>AI 부동산 매물 알림 자동화</h1>
          <p>AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        <Suspense fallback={<div className="auth-card"><p className="auth-note">로그인 화면을 준비하고 있습니다.</p></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
