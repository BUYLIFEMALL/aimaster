import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "이미지 변환 스튜디오 | AIMaster",
  description: "여러 이미지를 WebP·PNG·JPEG·AVIF로 일괄 변환하고, 고품질로 확대·축소하며, 콜라주로 합치는 브라우저 안에서만 동작하는 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
