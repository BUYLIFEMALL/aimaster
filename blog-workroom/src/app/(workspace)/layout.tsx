import { requireProgramAccess } from "@/lib/access";
import { Shell } from "@/components/layout/Shell";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  // v1.12 (BC-05): 보관 기간 안내
  return (
    <Shell email={user.email}>
      {children}
      <p className="retention-note" style={{ margin: "28px 0 8px", color: "#6b7280", fontSize: 12 }}>🗂️ 만든 작업(키워드·자료·초안·최종본·이미지)은 만든 날부터 30일 뒤 자동으로 삭제됩니다. 내 블로그·문체와 설정은 계속 보관됩니다.</p>
    </Shell>
  );
}
