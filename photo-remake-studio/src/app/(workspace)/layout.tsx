import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // 2026-10-21 병합 A(v1.11): 안내·브라우저 보관함만 남아 로그인만 확인한다(프로그램은 카탈로그에서 숨김).
  const user = await requireUser();
  return <Shell email={user.email}>{children}</Shell>;
}
