import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://www.buylife.xyz";
const SITE_NAME = "AI Master";
const DEFAULT_DESC = "AI 기반 마케팅 자동화 프로그램으로 시간을 절약하고 매출을 극대화하세요. 월별·6개월·12개월·평생 구독 플랜 제공.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Master — AI 마케팅 자동화 프로그램",
    template: "%s | AI Master",
  },
  description: DEFAULT_DESC,
  keywords: ["AI 마케팅", "마케팅 자동화", "AI Master", "SNS 자동화", "어필리에이트", "수익 공유"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "AI Master — AI 마케팅 자동화 프로그램",
    description: DEFAULT_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Master — AI 마케팅 자동화 프로그램",
    description: DEFAULT_DESC,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-dark text-white antialiased">{children}</body>
    </html>
  );
}
