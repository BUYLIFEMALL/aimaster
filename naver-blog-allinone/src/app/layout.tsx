import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "AI와 함께 아이디어 발굴부터 SEO 최적화 포스팅까지 한 곳에서 완성하는 네이버 블로그 올인원 자동화",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
