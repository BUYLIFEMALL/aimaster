import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "무한루프 영상자동화 | AIMaster",
  description: "영상에서 가장 자연스럽게 이어지는 구간을 찾아 끝없이 반복되는 MP4·WebM·GIF로 만드는, 브라우저 안에서만 동작하는 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
