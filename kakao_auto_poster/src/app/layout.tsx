import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "뉴스레터 자동화",
  description: "관심 주제/키워드를 등록하면 뉴스·정보·정책·트렌드 콘텐츠를 AI로 생성해 카카오톡 채널로 전달하는 자동화 웹",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50">{children}</body>
    </html>
  );
}
