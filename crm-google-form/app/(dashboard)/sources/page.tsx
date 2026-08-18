import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SourceCreateForm } from "@/components/sources/SourceCreateForm";
import { SourceCard, type FormSourceData } from "@/components/sources/SourceCard";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: sources } = await supabase
    .from("crm_form_sources")
    .select(
      "id, name, webhook_token, field_mapping, notify_email, notify_telegram, notify_sms, notify_alimtalk, notify_friendtalk, kakao_template_id, kakao_variables, is_active",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">구글폼 연결</h1>
        <p className="text-sm text-gray-500">
          본인의 구글폼(신청서/설문지 등)을 연결하면, 새 응답이 들어올 때마다 신청자에게
          접수 확인을 자동 발송하고 운영자 본인에게 텔레그램으로 알려드립니다. 폼 이름을 먼저
          등록한 뒤, 카드 안의 &quot;구글시트에 연결하는 방법&quot;을 따라 설정을 마쳐주세요.
        </p>
      </div>

      <SourceCreateForm />

      <div className="space-y-4">
        {(sources ?? []).map((source: FormSourceData) => (
          <SourceCard key={source.id} source={source} />
        ))}
        {(sources ?? []).length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">아직 연결된 구글폼이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
