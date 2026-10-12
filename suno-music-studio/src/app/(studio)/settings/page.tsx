import { requireProgramAccess } from "@/lib/access";
import { getRegisteredApiKeys } from "@/lib/apiKeys";
import { KeySettings } from "@/components/KeySettings";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Settings() {
  const u = await requireProgramAccess();
  return (
    <>
      <header className="page-heading">
        <h1>API키등록·플랫폼연동</h1>
        <p>
          사용할 AI의 본인 키만 등록하세요. 세 가지를 모두 등록할 필요는
          없습니다.
        </p>
      </header>
      <KeySettings initial={await getRegisteredApiKeys(u.id)} />
    </>
  );
}
