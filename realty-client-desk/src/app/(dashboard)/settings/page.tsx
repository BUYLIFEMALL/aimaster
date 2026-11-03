import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberCronjobKey, memberSchedulerState } from "@/lib/schedulerMember/memberScheduler";
import { OfficeForm } from "@/components/desk/OfficeForm";
import { SolapiAccountForm } from "@/components/desk/SolapiAccountForm";
import { SchedulerModePicker } from "@/components/desk/SchedulerModePicker";
import { CronjobKeyRow } from "@/components/desk/CronjobKeyRow";
import { AnthropicKeyRow } from "@/components/desk/AnthropicKeyRow";
import { PageHero } from "@/components/ui/PageHero";
import { GuideLinkButton } from "@/components/desk/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const mask = (k: string) => (k.length <= 8 ? "••••••••" : `${k.slice(0, 4)}••••${k.slice(-4)}`);

// 「API키등록·플랫폼연동」(플랫폼 표준 메뉴명). 2단계: 사무소 정보 + 본인 SOLAPI 계정 / 3단계(v1.04): 일정 알림 실행 방식(Vercel 기본 / 내 cron-job.org)
export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const service = createAdminClient() as unknown as SupabaseClient;
  const [{ data: office }, { data: account }, sched, cronKey, { data: claude }] = await Promise.all([
    db.from("realty_desk_offices").select("office_name, office_phone, office_address, reject_080, reg_no, broker_name").eq("user_id", user.id).maybeSingle(),
    db.from("user_solapi_accounts").select("api_key, sender_phone").eq("user_id", user.id).maybeSingle(),
    memberSchedulerState(service, user.id),
    memberCronjobKey(service, user.id),
    db.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", "anthropic").maybeSingle(),
  ]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHero badge="🔑 API키등록·플랫폼연동" title="사무소 정보와 문자 계정" description="매물 안내 문자와 일정 알림 문자를 보내려면 사무소 정보(광고 문자 맨 앞에 들어감)와 본인 SOLAPI 계정(문자 요금은 본인 계정에서)이 필요해요." />
      <OfficeForm office={office ?? null} />
      <SolapiAccountForm account={account ?? null} />
      <div className="mx-card space-y-3 p-5">
        <h2 className="text-lg font-bold text-mx-text">✨ AI 초안 (본인 Claude 키)</h2>
        <p className="text-sm text-mx-muted">「내 매물」에서 매물 광고 글·안내 문자 초안을 만들 때 써요. 요금은 본인 Anthropic 계정에서 나가요(초안 1회 약 10~30원). <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-mx-link underline">console.anthropic.com</a>에서 키를 만드세요.</p>
        <AnthropicKeyRow label="Claude(Anthropic) API 키" maskedValue={claude?.api_key ? mask(claude.api_key) : null} />
      </div>
      <div className="mx-card space-y-3 p-5">
        <h2 className="text-lg font-bold text-mx-text">⏰ 일정 알림 실행 방식</h2>
        <p className="text-sm text-mx-muted">「📅 일정」에 넣은 일정을 매일 아침 8시에 확인해 내 핸드폰으로 알려요. 보통은 기본(Vercel) 그대로 두시면 돼요.</p>
        <SchedulerModePicker initialMode={sched.mode} platformAvailable={sched.platformAvailable} hasKey={sched.hasKey} />
        <CronjobKeyRow label="cron-job.org API 키 (「내 cron-job.org」를 쓸 때만)" maskedValue={cronKey ? mask(cronKey) : null} />
      </div>
      <div className="mx-card p-5 text-sm text-mx-muted">
        <h2 className="mb-2 text-base font-bold text-mx-text">📖 연동 매뉴얼</h2>
        <p className="mb-2">눌러서 옆에 띄워 두고 그대로 따라 하세요.</p>
        <GuideLinkButton guideId="eb8f5eaf-6ef7-46b8-9b05-994e944fe69a" label="SOLAPI(문자) API 키 발급받기" />
      </div>
    </div>
  );
}
