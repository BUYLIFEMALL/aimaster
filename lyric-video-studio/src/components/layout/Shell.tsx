"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { StudioProvider } from "@/components/studio/StudioContext";
import { ConfirmProvider } from "@/components/ui/Confirm";

export function Shell({ email, children }: { email?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <Sidebar userEmail={email} currentPath={pathname} />
      <main className="main-workspace"><div className="workspace-content">
        {/* U3 — 767px 이하에서만 보임(CSS). 휴대폰에서도 가사 넣기·싱크·보관함은 그대로 쓰고, 영상 만들기만 PC를 권함 */}
        <p className="mobile-pc-notice" role="note">💻 MP4 영상 만들기는 PC의 크롬·엣지에서 해 주세요. 휴대폰에서는 가사 넣기·싱크·보관함 확인을 할 수 있습니다.</p>
        <ConfirmProvider><StudioProvider>{children}</StudioProvider></ConfirmProvider></div></main>
    </div>
  );
}
