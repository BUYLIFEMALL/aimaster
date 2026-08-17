import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "이메일 자동발송 (STEP Mail)",
  description: "리드를 업로드하고 여러 이메일 계정으로 AI가 작성한 이메일을 예약 발송합니다.",
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
