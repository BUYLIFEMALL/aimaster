import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "뮤직비디오 스튜디오 | AIMaster",
  description: "노래 가사에서 스토리보드를 만들고, 장면별 이미지와 Veo 영상 클립까지 한 곳에서 제작하는 뮤직비디오 스튜디오",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
