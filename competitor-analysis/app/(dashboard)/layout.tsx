import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="min-w-0 flex-1 p-4 md:p-8"><p className="mb-5 text-xs leading-relaxed text-mx-muted" role="note">
        분석 결과·회사 조사 정보는 회원님만 볼 수 있으며 생성일로부터 30일 후 자동 삭제됩니다. 필요한 결과는 미리 복사해 보관해 주세요.
      </p>{children}</main>
    </div>
  );
}
