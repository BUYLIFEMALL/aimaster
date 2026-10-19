import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "__LAB_NAME__",
  description: "AIMaster_dev Lab 프로그램",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
