import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { APP_NAME } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} | AIMaster`,
  description: "용도를 고르고 설명을 맡기면 내 PC가 그림을 그려 폴더에 모아 줍니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
