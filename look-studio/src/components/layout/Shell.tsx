"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function Shell({ email, children }: { email?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <Sidebar userEmail={email} currentPath={pathname} />
      <main className="main-workspace">
        <div className={`workspace-content ${pathname === "/studio" ? "wide" : ""}`}>{children}</div>
      </main>
    </div>
  );
}
