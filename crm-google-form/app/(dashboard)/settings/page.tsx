import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/layout/PageHero";
import { createClient } from "@/lib/supabase/server";
import { ProviderAccountSection } from "@/components/settings/ProviderAccountSection";
import type { SmtpAccountData } from "@/components/settings/SmtpAccountCard";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { SolapiAccountSection } from "@/components/settings/SolapiAccountSection";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { SMTP_PROVIDER_PRESETS } from "@/lib/constants";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// platform_guides.id — 이 프로그램이 실제로 쓰는 발송 계정(SMTP/SOLAPI/텔레그램)에 해당하는
// 매뉴얼만 골랐다(2026-09-13, 플랫폼 표준 "API키등록·플랫폼연동 페이지" 규칙).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1dbea19b-4c83-4453-ae41-0b59d7f27b5f", label: "네이버 메일(SMTP) 연동하기" },
  { guideId: "eb8f5eaf-6ef7-46b8-9b05-994e944fe69a", label: "SOLAPI(카카오톡 알림톡/친구톡) API 키 발급받기" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: accounts }, { data: telegramLink }, { data: solapiAccount }] = await Promise.all([
    supabase
      .from("user_smtp_accounts")
      .select("id, label, provider, smtp_host, smtp_port, smtp_user, from_name, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "crm-google-form")
      .maybeSingle(),
    supabase
      .from("user_solapi_accounts")
      .select("api_key, sender_phone, kakao_pf_id, rcs_brand_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHero
        badge="🔑 API키등록·플랫폼연동"
        title="발송 계정 설정"
        description="신청자에게 보낼 이메일(SMTP)·문자·카카오(SOLAPI) 계정과 운영자 알림용 텔레그램을 등록하세요. 모두 회원님 본인 계정만 사용하며, 관리자 공용 계정으로 대체되지 않습니다."
        tip="이메일·SOLAPI 계정은 다른 AIMaster 프로그램(예: Step Mail)과 함께 쓰이고, 텔레그램은 프로그램마다 따로 연결합니다."
      />

      <section className="glass-card space-y-4 rounded-2xl border border-mx-border bg-mx-surface p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-mx-text">📧 이메일(SMTP) 발송 계정</h2>
          <p className="text-sm text-mx-muted">
            신청자에게 접수 확인 이메일을 보낼 계정입니다. 플랫폼별로 여러 개 등록할 수 있어요.
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
      </section>

      <SolapiAccountSection account={solapiAccount ?? null} />

      <section className="glass-card space-y-4 rounded-2xl border border-mx-border bg-mx-surface p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-mx-text">📱 텔레그램 연동</h2>
          <p className="text-sm text-mx-muted">운영자 본인 텔레그램으로 신청 내역을 요약해서 받아보세요.</p>
        </div>

        {telegramLink ? (
          <div className="space-y-3">
            <p className="text-sm text-mx-success">
              ✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.
            </p>
            <form action={disconnectTelegramAction}>
              <button
                type="submit"
                className="rounded-lg bg-[#fff1f2] px-4 py-2 text-xs font-bold text-mx-danger hover:bg-red-100"
              >
                연동 해제
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="list-inside list-decimal space-y-2 text-sm text-mx-muted">
              <li>
                텔레그램에서 <span className="font-semibold text-mx-text">@BotFather</span>를
                검색해서 대화를 시작하세요.
              </li>
              <li>
                <code className="rounded bg-mx-raised px-1 py-0.5">/newbot</code> 명령을 보내고,
                안내에 따라 봇 이름을 정하세요 (마지막엔 반드시{" "}
                <code className="rounded bg-mx-raised px-1 py-0.5">bot</code>으로 끝나야 해요, 예:{" "}
                <code className="rounded bg-mx-raised px-1 py-0.5">my_crm_bot</code>).
              </li>
              <li>
                완료되면 BotFather가 <strong>토큰</strong>(숫자:영문조합 문자열)을 알려줘요. 그
                값을 복사하세요.
              </li>
              <li>
                방금 만든 내 봇을 텔레그램에서 열고, <strong>아무 메시지나 1개</strong> 보내세요
                (예: &quot;안녕&quot;).
              </li>
              <li>아래 입력창에 토큰을 붙여넣고 &quot;연동 확인하기&quot;를 눌러주세요.</li>
            </ol>
            <TelegramConnectForm />
          </div>
        )}
      </section>

      <section className="glass-card space-y-4 rounded-2xl border border-mx-border bg-mx-surface p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-mx-text">📖 연동 매뉴얼</h2>
          <p className="text-sm text-mx-muted">
            이 프로그램에서 사용하는 발송 계정 연동 방법을 팝업창으로 열어 옆에 두고 그대로 따라
            할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((guide) => (
            <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
          ))}
        </div>
      </section>
    </div>
  );
}
