import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ProviderAccountSection } from "@/components/accounts/ProviderAccountSection";
import type { SmtpAccountData } from "@/components/accounts/SmtpAccountCard";
import { SMTP_PROVIDER_PRESETS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("user_smtp_accounts")
    .select("id, label, provider, smtp_host, smtp_port, smtp_user, from_name, is_active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // 등록 당시 provider가 프리셋 밖의 값(레거시/누락)이면 "기타" 섹션에 모아 보여준다.
  const knownProviders = new Set(SMTP_PROVIDER_PRESETS.map((p) => p.value));
  const accountsByProvider = new Map<string, SmtpAccountData[]>();
  for (const account of accounts ?? []) {
    const key = account.provider && knownProviders.has(account.provider) ? account.provider : "other";
    const list = accountsByProvider.get(key) ?? [];
    list.push(account);
    accountsByProvider.set(key, list);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">이메일 계정</h1>
        <p className="text-sm text-gray-500">
          발송에 사용할 본인 이메일 계정을 플랫폼별로 등록하세요. 같은 플랫폼 안에서도 여러 개
          등록할 수 있고, 예약 발송 시 캠페인에 선택한 계정들을 순서대로 돌려가며 나눠 보내
          스팸/평판 위험을 줄입니다.
        </p>
      </div>

      <div className="space-y-4">
        {SMTP_PROVIDER_PRESETS.map((preset) => (
          <ProviderAccountSection
            key={preset.value}
            preset={preset}
            accounts={accountsByProvider.get(preset.value) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
