import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireAccessScope } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 간편 모드: 에이전트 권한 회원만(2026-11-01 BLOG 권한 입구 제거). scope는 지금 항상 "full".
export default async function QuickLayout({ children }: { children: React.ReactNode }) {
  const { user, scope } = await requireAccessScope();
  return (
    <DashboardShell userEmail={user.email || ""} scope={scope}>
      {children}
    </DashboardShell>
  );
}
