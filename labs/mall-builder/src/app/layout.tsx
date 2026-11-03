import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 쇼핑몰 빌더",
  description: "회원마다 자기 쇼핑몰을 개설하는 B2B 쇼핑몰 빌더 (AIMaster_dev Lab)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
