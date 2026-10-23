"use client";
// 원본 litpage 화면(main.tsx가 하던 일)을 브라우저에서만 띄운다. 원본은 처음 불러올 때부터 window·document를 쓰므로
// 서버 렌더링을 끈다. CSS는 동적으로 불러올 수 없어 여기서 바로 불러온다.
import dynamic from "next/dynamic";
import "@/litpage/web/styles/base.css";

const App = dynamic(
  async () => {
    await import("@/litpage/web/lib/linkGuard.ts");
    return (await import("@/litpage/web/App.tsx")).App;
  },
  { ssr: false, loading: () => <div className="nc-boot" /> },
);

export function WorkspaceApp({ email }: { email: string }) {
  return (
    <div id="lit-app" data-member-email={email}>
      <App />
    </div>
  );
}
