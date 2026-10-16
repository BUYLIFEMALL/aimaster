import { requireProgramAccess } from "@/lib/access";
import { GuideShell } from "@/components/guide/GuideShell";

// 권한 확인 결과가 정적으로 캐시되지 않게 선언 (CLAUDE.md 핵심 원칙 6)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuidePage() {
  const user = await requireProgramAccess();
  return <GuideShell userEmail={user.email ?? "회원"} />;
}
