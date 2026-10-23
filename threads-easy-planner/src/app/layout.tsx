import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Threads AI 기획기 | AIMaster",
  description: "초보자도 버튼 하나로 완성하는 스레드 AI 글기획 및 바이럴 포스팅 생성기",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-neutral-50/60 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
