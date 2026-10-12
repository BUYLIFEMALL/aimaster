import { requireProgramAccess } from "@/lib/access";
import { getRegisteredApiKeys } from "@/lib/apiKeys";
import { AllKeySettings } from "@/components/KeySettings";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SettingsPage() {
  const user = await requireProgramAccess();

  return (
    <>
      <header className="page-heading">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold mb-3 shadow-2xs">
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          <span>개인 API 키 및 플랫폼 계정 연동</span>
        </div>
        <h1>API키등록·플랫폼연동</h1>
        <p>회원 본인의 안전한 API 키로 나만의 감성 글귀와 배경 이미지를 생성합니다</p>
      </header>
      <AllKeySettings initial={await getRegisteredApiKeys(user.id)} />
    </>
  );
}
