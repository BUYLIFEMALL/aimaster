import { requireProgramAccess } from "@/lib/access";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";

// 권한 확인 결과가 정적으로 캐시되지 않게 선언
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Page() {
  // 로그인 검증 및 프로그램 이용 권한 확인 (비로그인은 https://buylife.xyz/login 으로 자동 리다이렉트)
  const user = await requireProgramAccess();

  return <StudioWorkspace userEmail={user.email ?? "회원"} />;
}
