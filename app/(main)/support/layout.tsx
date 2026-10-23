import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "고객지원",
  description: "AI Master 고객지원 센터. 문의사항이나 기술 지원이 필요하시면 언제든 연락주세요.",
  openGraph: {
    title: "고객지원 | AI Master",
    description: "AI Master 고객지원 센터에 문의하세요.",
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
