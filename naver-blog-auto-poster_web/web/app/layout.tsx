import type { Metadata } from "next";
import "./globals.css";
import { APP_VERSION, MAIN_SITE_ORIGIN } from "@/lib/version";

export const metadata: Metadata = { title: "네이버 블로그 자동화(Web) - 확장 연동 | AIMaster" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 md:px-8">
          <div className="mb-6 flex items-center justify-between text-xs text-subtext">
            <a href={`${MAIN_SITE_ORIGIN}/programs`} className="hover:text-white">← 다른 프로그램 보기</a>
            <span>{APP_VERSION}</span>
          </div>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
