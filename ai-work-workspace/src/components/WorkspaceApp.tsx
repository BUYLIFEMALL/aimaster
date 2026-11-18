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

// gmailOn: E4 Gmail 서버 스위치(2026-11-18 WS-20261118-04 워크스페이스 안 받은 업무 화면이 읽음, 서버가 준 값만)
export function WorkspaceApp({ email, gmailOn }: { email: string; gmailOn?: boolean }) {
  return (
    <div id="lit-app" data-member-email={email} data-gmail-on={gmailOn ? "1" : undefined}>
      <App />
    </div>
  );
}
