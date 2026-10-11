import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_VERSION}) - AI 지능형 웹 데이터 크롤러`,
  description: "대상 웹사이트 URL 입력으로 실시간 HTML 파싱, 7대 핵심 데이터 자동 분류, 시각적 섹터 선택 및 Gemini AI 기반 스마트 리스트 구조화 추출 솔루션",
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
