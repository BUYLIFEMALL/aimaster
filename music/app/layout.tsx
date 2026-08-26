import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "음악 자동화",
  description: "곡 설명을 입력하면 AI가 장르/제목/가사를 기획하고 Suno로 실제 곡을 자동 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
