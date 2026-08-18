import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "구글폼 신청접수 CRM 자동화",
  description: "구글폼에 새 응답이 들어오면 이메일/문자/카카오/텔레그램으로 자동 응대합니다.",
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
