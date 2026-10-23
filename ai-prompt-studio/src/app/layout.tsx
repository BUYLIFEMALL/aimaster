import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: `${APP_NAME} (${APP_VERSION}) - AIMaster`,
  description: "RTSC, 비즈니스 프레임워크, Vertex AI XML, CoT 논리적 추론 기반 메타 프롬프트 엔지니어링 자동화",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
