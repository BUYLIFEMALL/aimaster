import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_VERSION}) - AI 지능형 웹 데이터 크롤러`,
  description: "웹사이트 URL을 입력하여 메타데이터, 구조, 글목록, 표, 링크, 이미지를 자동 추출하고 Gemini AI로 스마트 리스트를 생성하는 웹 데이터 스크래핑 솔루션",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
