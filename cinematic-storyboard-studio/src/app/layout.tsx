import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "시네마틱 스토리보드 자동화 | AIMaster",
  description: "이미지 한 장으로 영화 같은 9컷 스토리보드와 영상 생성용 프롬프트를 만드는, 회원 본인의 Gemini 키로 동작하는 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
