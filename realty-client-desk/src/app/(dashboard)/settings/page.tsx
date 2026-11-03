import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { OfficeForm } from "@/components/desk/OfficeForm";
import { SolapiAccountForm } from "@/components/desk/SolapiAccountForm";
import { PageHero } from "@/components/ui/PageHero";
import { GuideLinkButton } from "@/components/desk/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

// 「API키등록·플랫폼연동」(플랫폼 표준 메뉴명). 2단계(2026-11-03): 사무소 정보 + 본인 SOLAPI 계정
export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const [{ data: office }, { data: account }] = await Promise.all([
    db.from("realty_desk_offices").select("office_name, office_phone, office_address, reject_080").eq("user_id", user.id).maybeSingle(),
    db.from("user_solapi_accounts").select("api_key, sender_phone").eq("user_id", user.id).maybeSingle(),
  ]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHero badge="🔑 API키등록·플랫폼연동" title="사무소 정보와 문자 계정" description="매물 안내 문자를 보내려면 두 가지가 필요해요. 사무소 정보(문자 맨 앞에 들어감)와 본인 SOLAPI 계정(문자 요금은 본인 계정에서)." />
      <OfficeForm office={office ?? null} />
      <SolapiAccountForm account={account ?? null} />
      <div className="mx-card p-5 text-sm text-mx-muted">
        <h2 className="mb-2 text-base font-bold text-mx-text">📖 연동 매뉴얼</h2>
        <p className="mb-2">눌러서 옆에 띄워 두고 그대로 따라 하세요.</p>
        <GuideLinkButton guideId="eb8f5eaf-6ef7-46b8-9b05-994e944fe69a" label="SOLAPI(문자) API 키 발급받기" />
      </div>
    </div>
  );
}
