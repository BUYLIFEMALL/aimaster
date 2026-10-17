import type { Metadata } from "next";
import "./globals.css";
import { brandTitle } from "@/threads-content-ops/lib/deployment";

export const metadata: Metadata = {
  title: brandTitle("Threads 콘텐츠 운영 자동화"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
