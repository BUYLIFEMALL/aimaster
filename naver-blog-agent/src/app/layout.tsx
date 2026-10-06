import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "네이버 블로그 에이전트 | AIMaster",
  description: "크롬 확장과 멀티 AI 에이전트로 봇 탐지 없이 네이버 스마트에디터 ONE에 안전하게 자동 발행",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireProgramAccess();

  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar userEmail={user.email || ""} />
          <div className="flex flex-1 flex-col min-w-0">
            <Header userEmail={user.email || ""} />
            <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
