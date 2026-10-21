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
      <main className="main-workspace"><div className="workspace-content"><ConfirmProvider><StudioProvider>{children}</StudioProvider></ConfirmProvider></div></main>
    </div>
  );
}
