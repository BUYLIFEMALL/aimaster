import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_VERSION}) - AI 지능형 웹 데이터 크롤러`,
  description: "웹사이트 URL 입력으로 본문·표·이미지를 자동 수집하고, AI로 원하는 목록을 구조화하여 추출하는 지능형 웹 스크래퍼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-mx-bg text-mx-text antialiased selection:bg-mx-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
