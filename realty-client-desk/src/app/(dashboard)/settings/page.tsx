import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberCronjobKey } from "@/lib/schedulerMember/memberScheduler";
import { AI_ENGINES } from "@/lib/ai/engines";
import { OfficeForm } from "@/components/desk/OfficeForm";
import { SolapiAccountForm } from "@/components/desk/SolapiAccountForm";
import { CronjobKeyRow } from "@/components/desk/CronjobKeyRow";
import { AiKeyRow } from "@/components/desk/AiKeyRow";
import { SignupLinks } from "@/components/desk/SignupLinks";
import { PageHero } from "@/components/ui/PageHero";
import { GuideLinkButton } from "@/components/desk/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const mask = (k: string) => (k.length <= 8 ? "••••••••" : `${k.slice(0, 4)}••••${k.slice(-4)}`);

// 「API키등록·플랫폼연동」(플랫폼 표준 메뉴명). 사무소 정보 + 본인 SOLAPI + AI 키 3종(OpenAI·Claude·Gemini) + 일정 알림용 본인 cron-job.org(2026-11-03 기본·유일 방식)
export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const service = createAdminClient() as unknown as SupabaseClient;
  const [{ data: office }, { data: account }, cronKey, { data: aiKeys }] = await Promise.all([
    db.from("realty_desk_offices").select("office_name, office_phone, office_address, reject_080, reg_no, broker_name").eq("user_id", user.id).maybeSingle(),
    db.from("user_solapi_accounts").select("api_key, sender_phone").eq("user_id", user.id).maybeSingle(),
    memberCronjobKey(service, user.id),
    db.from("user_api_keys").select("provider, api_key").eq("user_id", user.id).in("provider", ["openai", "anthropic", "gemini"]),
  ]);
  const keyOf = new Map<string, string>((aiKeys ?? []).map((k: { provider: string; api_key: string }) => [k.provider, k.api_key]));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHero badge="🔑 API키등록·플랫폼연동" title="사무소 정보와 연결 계정" description="문자는 본인 SOLAPI, AI 초안은 본인 AI 키, 아침 일정 알림은 본인 무료 cron-job.org로 돌아가요. 요금은 모두 본인 계정에서 나가요." />
      <OfficeForm office={office ?? null} />
      <SolapiAccountForm account={account ?? null} />
      <div className="mx-card space-y-3 p-5">
        <h2 className="text-lg font-bold text-mx-text">✨ AI 초안 키 (쓰고 싶은 것만)</h2>
        <p className="text-sm text-mx-muted">「내 매물」에서 광고 글·안내 문자 초안을 만들 때 쓰는 키예요. 하나만 넣어도 되고, 매물 화면에서 플랫폼과 모델을 골라 써요. 다른 AIMaster 프로그램에서 넣은 키는 「등록됨」으로 그대로 보여요.</p>
        {AI_ENGINES.map((e) => <AiKeyRow key={e.id} provider={e.id} maskedValue={keyOf.get(e.keyProvider) ? mask(keyOf.get(e.keyProvider)!) : null} />)}
      </div>
      <div className="mx-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-mx-text">⏰ 일정 알림 (본인 무료 cron-job.org)</h2>
          <SignupLinks links={[{ label: "cron-job.org 가입하기", href: "https://console.cron-job.org/signup" }, { label: "API 키 만들기", href: "https://console.cron-job.org/settings" }]} />
        </div>
        <p className="text-sm text-mx-muted">「📅 일정」에 넣은 일정을 매일 아침 8시에 확인해 내 핸드폰으로 알려 줘요. 무료 cron-job.org 계정이 그 시각에 이 프로그램을 불러 주는 방식이에요.</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-mx-text">
          <li>위 「cron-job.org 가입하기」에서 무료 가입 → 이메일 인증 → 로그인</li>
          <li>콘솔 <b>Settings → API</b>에서 <b>Create API key</b> → 키 복사(<b>IP 제한은 켜지 마세요</b>)</li>
          <li>아래에 붙여 넣고 저장 — 일정이 있으면 작업이 자동으로 만들어지고, 일정이 없으면 자동으로 멈춰요</li>
        </ol>
        <CronjobKeyRow label="cron-job.org API 키" maskedValue={cronKey ? mask(cronKey) : null} />
        <p className="text-xs text-mx-muted">💡 이 키는 예약 기능이 있는 다른 AIMaster 프로그램에서도 그대로 써요.</p>
      </div>
      <div className="mx-card p-5 text-sm text-mx-muted">
        <h2 className="mb-2 text-base font-bold text-mx-text">📖 연동 매뉴얼</h2>
        <p className="mb-2">눌러서 옆에 띄워 두고 그대로 따라 하세요.</p>
        <GuideLinkButton guideId="eb8f5eaf-6ef7-46b8-9b05-994e944fe69a" label="SOLAPI(문자) API 키 발급받기" />
      </div>
    </div>
  );
}
