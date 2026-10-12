import { requireProgramAccess } from "@/lib/access";
import { getRegisteredApiKeys } from "@/lib/apiKeys";
import { AllKeySettings } from "@/components/KeySettings";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function SettingsPage() {
  const user = await requireProgramAccess();
  return (
    <>
      <header className="page-heading">
        <h1>API키등록·플랫폼연동</h1>
        <p>회원 본인의 API 키로 글귀와 배경을 만듭니다.</p>
      </header>
      <AllKeySettings initial={await getRegisteredApiKeys(user.id)} />
    </>
  );
}
