import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "예약(취소)방지 리마인드 자동화",
  description: "예약일시 기준으로 리마인드/방문 후 리뷰요청 메시지를 자동 발송합니다.",
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
