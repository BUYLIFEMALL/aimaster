import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOUTUBE CHANNEL CONSULTANT - AIMaster",
  description: "유튜브 채널 지표 진단과 키워드 검색 결과 분석으로 성장 인사이트를 찾는 채널 컨설턴트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
