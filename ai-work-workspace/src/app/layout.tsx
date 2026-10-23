import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "문서·업무 데이터베이스·AI 에이전트를 한곳에 모아 팀 업무를 정리하고 자동으로 처리하는 워크스페이스",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// 원본 index.html: 첫 화면을 그리기 전에 기기에 저장된 테마(라이트·다크·시스템)를 적용한다
const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('nc:theme')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.add(d?'lit-dark-theme':'lit-light-theme');}catch(e){document.documentElement.classList.add('lit-light-theme');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="lit-html" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="lit-body">{children}</body>
    </html>
  );
}
