import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/layout/PageHero";
import { createClient } from "@/lib/supabase/server";
import { SourceCreateForm } from "@/components/sources/SourceCreateForm";
import { SourceCard, type FormSourceData } from "@/components/sources/SourceCard";
import type { FollowupRuleData } from "@/components/sources/FollowupRulesSection";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SourcesPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: sources }, { data: rules }] = await Promise.all([
    supabase
      .from("crm_form_sources")
      .select(
        "id, name, webhook_token, field_mapping, notify_email, notify_telegram, notify_sms, notify_alimtalk, notify_friendtalk, kakao_template_id, kakao_variables, is_active",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("crm_followup_rules")
      .select(
        "id, form_source_id, name, days_after, channel_email, channel_sms, channel_alimtalk, channel_friendtalk, message_subject, message_text, kakao_template_id, kakao_variables, is_active",
      )
      .eq("user_id", user.id)
      .order("days_after", { ascending: true }),
  ]);

  const rulesBySource = new Map<string, FollowupRuleData[]>();
  for (const rule of rules ?? []) {
    const list = rulesBySource.get(rule.form_source_id) ?? [];
    list.push(rule);
    rulesBySource.set(rule.form_source_id, list);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHero
        badge="🔗 STEP 1 · 구글폼 연결"
        title="구글폼 연결"
        description="본인의 구글폼(신청서·설문지 등)을 연결하면, 새 응답이 들어올 때마다 신청자에게 접수 확인을 자동 발송하고 운영자 본인에게 텔레그램으로 알려 드립니다."
        tip="폼 이름을 먼저 등록한 뒤, 카드 안의 「구글시트에 연결하는 방법」을 따라 설정을 마쳐 주세요."
      />

      <SourceCreateForm />

      <div className="space-y-4">
        {(sources ?? []).map((source: FormSourceData) => (
          <SourceCard key={source.id} source={source} followupRules={rulesBySource.get(source.id) ?? []} />
        ))}
        {(sources ?? []).length === 0 && (
          <p className="text-center text-sm text-mx-muted py-8">아직 연결된 구글폼이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
