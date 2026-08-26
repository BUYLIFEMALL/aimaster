import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "인스타 DM 자동응답",
  description: "인스타그램 DM으로 온 문의를 AI가 읽고 자연스러운 답장 초안을 만들어, 검토 후(또는 자동으로) 발송해드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
