"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DialogHost from "@/components/DialogHost";

interface DashboardShellProps {
  userEmail: string;
  children: React.ReactNode;
  scope?: "full" | "quick";
}

export function DashboardShell({ userEmail, children, scope = "full" }: DashboardShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#f8fafc] text-slate-900">
      {/* 사이드바 (데스크톱 고정 + 모바일 오버레이 드로어) */}
      <Sidebar
        userEmail={userEmail}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        scope={scope}
      />

      {/* 우측 메인 영역 */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          userEmail={userEmail}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <DialogHost />
    </div>
  );
}
