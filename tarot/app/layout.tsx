import type { Metadata } from "next";
import { KakaoScript } from "@/components/KakaoScript";
import { getSessionUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { HeaderNav } from "@/components/layout/HeaderNav";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tarot-reading.buylife.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "AIMaster 타로점 - 12종 정통 스프레드 & AI 고유 일러스트 심층 리딩",
  description: "질문 하나를 떠올리고 12종 정통 스프레드와 12대 화풍을 선택해 카드를 뽑아보세요. AI가 실시간으로 그린 카드 일러스트와 AI 심층 타로 해석을 안전하게 보관할 수 있습니다.",
  openGraph: {
    title: "AIMaster 타로점 — Mystic Midnight Lab",
    description: "12종 정통 스프레드와 12대 화풍으로 만나는 나만의 맞춤 AI 타로 리딩",
    images: ["/api/og"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="ko">
      <body className="bg-[#090614] text-[#f1f5f9] min-h-screen">
        <KakaoScript />
        <div className="min-h-screen flex flex-col">
          <HeaderNav userEmail={user?.email} signOutAction={signOutAction} />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
