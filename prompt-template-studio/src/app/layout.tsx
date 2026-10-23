import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_VERSION}) - AIMaster`,
  description: "동적 변수 기반 맞춤형 프롬프트 템플릿 보관함 & AI 자동 채우기 원클릭 실행 스튜디오",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
