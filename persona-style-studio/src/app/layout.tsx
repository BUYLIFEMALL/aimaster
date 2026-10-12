import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "페르소나 문체 자동화 | AIMaster",
  description: "슬라이더 이퀄라이저와 캐릭터 페르소나로 글의 문체를 다시 써 주는, 회원 본인의 Gemini 키로 동작하는 글쓰기 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
