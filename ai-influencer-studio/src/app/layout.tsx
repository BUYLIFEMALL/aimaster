import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_VERSION}) - AIMaster`,
  description: "초현실적 가상 인플루언서 화보 & 인스타그램 3종 캡션 자동 생성 스튜디오",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-if-bg text-if-text antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
