import type { Metadata } from "next";
import { APP_NAME } from "@/lib/version";
import "./globals.css";
export const metadata: Metadata = { title: APP_NAME, description: "글감부터 원고·이미지·SEO 점검까지, 블로그 콘텐츠를 한곳에서 완성합니다.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
