import type { Metadata } from "next";
import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/Sidebar";

// 권한 판정 결과가 정적으로 굳지 않게 한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 로그인 뒤 작업 화면은 검색에서 뺀다(공개 소개는 메인 사이트 프로그램 상세가 맡는다).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  return (
    <div className="app-shell">
      <Sidebar email={user.email || ""} />
      <main className="app-main">{children}</main>
    </div>
  );
}
