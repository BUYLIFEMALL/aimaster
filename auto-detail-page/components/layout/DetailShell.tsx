"use client";

import { usePathname } from "next/navigation";
import DetailSidebar from "./DetailSidebar";

export default function DetailShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 로그인/회원가입 및 미리보기 페이지는 사이드바 제외
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isPreviewPage = pathname.startsWith("/preview");

  if (isAuthPage || isPreviewPage) {
    return <div className="w-full min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-50 text-slate-900 font-sans">
      <DetailSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
