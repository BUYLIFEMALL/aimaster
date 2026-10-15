import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Threads 콘텐츠 운영 자동화 | AIMaster",
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
