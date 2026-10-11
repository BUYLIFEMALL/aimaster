import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STYLE DNA ANALYZER - AIMaster",
  description: "이미지 한 장의 카메라·조명·색감·스타일을 분석해 재현용 마스터 프롬프트로 만들어 주는 스타일 DNA 분석기",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50/50">{children}</body>
    </html>
  );
}
