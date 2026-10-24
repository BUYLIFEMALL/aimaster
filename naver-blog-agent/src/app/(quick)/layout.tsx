import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireAccessScope } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// E-4 간편 모드 무료 입구: 에이전트 권한(전체) 또는 BLOG 권한(간편) 회원만. 간편 회원은 짧은 메뉴만 본다.
export default async function QuickLayout({ children }: { children: React.ReactNode }) {
  const { user, scope } = await requireAccessScope();
  return (
    <DashboardShell userEmail={user.email || ""} scope={scope}>
      {children}
    </DashboardShell>
  );
}
