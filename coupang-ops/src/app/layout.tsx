import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://coupang-ops.buylife.xyz"),
  title: "AI 쿠팡 운영 자동화 | AIMaster",
  description: "쿠팡 공식 WING Open API로 상품 등록부터 10원 최저가 위너 방어·주문·송장·문의까지 내 쿠팡 판매를 한 화면에서 처리하는 운영 도우미",
  openGraph: {
    title: "AI 쿠팡 운영 자동화 | 아이템위너 인텔리전스 랩",
    description: "쿠팡 WING Open API 연동 10원 단위 최저가 위너 탈환 & 상품 대량 등록·발주 관제 올인원 스튜디오",
    url: "https://coupang-ops.buylife.xyz",
    siteName: "AIMaster",
    images: [
      {
        url: "/coupang-ops-thumbnail.jpg",
        width: 1280,
        height: 720,
        alt: "AI 쿠팡 운영 자동화 썸네일",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 쿠팡 운영 자동화 | AIMaster",
    description: "쿠팡 공식 WING Open API 기반 상품 대량 등록 및 10원 최저가 위너 실시간 방어",
    images: ["/coupang-ops-thumbnail.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-slate-900">{children}</body>
    </html>
  );
}
