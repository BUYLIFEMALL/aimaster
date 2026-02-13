import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Master — AI 마케팅 자동화 프로그램",
  description: "최강의 AI 마케팅 자동화 프로그램으로 비즈니스를 혁신하세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-dark text-white antialiased">{children}</body>
    </html>
  );
}
