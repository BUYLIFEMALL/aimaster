import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CARDNEWS STUDIO - AIMaster",
  description: "주제만 넣으면 AI가 문구와 배경을 만들어 글자가 얹힌 카드뉴스를 완성하는 카드뉴스 스튜디오",
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
