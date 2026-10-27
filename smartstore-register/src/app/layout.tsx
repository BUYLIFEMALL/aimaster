import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 스마트스토어 상품 자동등록기 | AIMaster",
  description: "AI 상세페이지로 만든 상품을 크롬 확장이 스마트스토어 상품 등록 화면에 대신 채워 넣는 등록 도우미",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-slate-900">{children}</body>
    </html>
  );
}
