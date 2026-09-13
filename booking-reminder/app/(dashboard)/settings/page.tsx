import { requireProgramAccess } from "@/lib/access";
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

// app/(main)/guides의 platform_guides.id — 이 프로그램이 실제로 쓰는 발송 채널(SMTP/SOLAPI/
// 텔레그램)에 해당하는 매뉴얼만 골랐다(2026-09-13, naver-cafe-poster 패턴을 전체 서브프로젝트로
// 확대 적용).
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
      .eq("program_slug", "booking-reminder")
      .maybeSingle(),
    supabase
      .from("user_solapi_accounts")
      .select("api_key, sender_phone, kakao_pf_id, rcs_brand_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // crm-google-form에서 이미 이 계정들을 등록했다면(공용 테이블) 여기서 그대로 보입니다.
  const knownProviders = new Set(SMTP_PROVIDER_PRESETS.map((p) => p.value));
  const accountsByProvider = new Map<string, SmtpAccountData[]>();
  for (const account of accounts ?? []) {
    const key = account.provider && knownProviders.has(account.provider) ? account.provider : "other";
    const list = accountsByProvider.get(key) ?? [];
    list.push(account);
    accountsByProvider.set(key, list);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <section>
        <h1 className="text-2xl font-black text-gray-900 mb-2">발송 계정 설정</h1>
        <p className="text-sm text-gray-500">
          예약 리마인드를 보낼 이메일/문자·카카오/텔레그램 계정을 등록하세요. 이메일·문자·카카오
          계정은 다른 AIMaster 프로그램(crm-google-form 등)에서 이미 등록하셨다면 여기서도 그대로
          재사용됩니다. 단, 텔레그램 봇 연동은 프로그램마다 독립적이라 여기서 별도로 연동해야
          합니다.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900">✉️ 이메일 발송 (SMTP)</h2>
          <p className="mt-1 text-xs text-gray-500">
            리마인드/리뷰요청 메일을 보낼 SMTP 계정입니다. 구글·네이버 등 플랫폼별로 여러 계정을 등록할 수 있어요.
          </p>
        </div>
        <div className="space-y-4">
          {SMTP_PROVIDER_PRESETS.map((preset) => (
            <ProviderAccountSection key={preset.value} preset={preset} accounts={accountsByProvider.get(preset.value) ?? []} />
          ))}
        </div>
      </section>

      <SolapiAccountSection account={solapiAccount ?? null} />

      <section className="space-y-4 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900">📨 텔레그램 알림 연동</h2>
          <p className="mt-1 text-xs text-gray-500">봇을 연동해두면 예약 리마인드를 텔레그램으로도 받을 수 있어요.</p>
        </div>

        {telegramLink ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.</p>
            <form action={disconnectTelegramAction}>
              <button type="submit" className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
                연동 해제
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="list-inside list-decimal space-y-2 text-sm text-gray-600">
              <li>
                텔레그램에서 <span className="font-semibold text-gray-900">@BotFather</span>를 검색해서 대화를 시작하세요.
              </li>
              <li>
                <code className="rounded bg-gray-100 px-1 py-0.5">/newbot</code> 명령을 보내고, 안내에 따라 봇 이름을 정하세요 (마지막엔
                반드시 <code className="rounded bg-gray-100 px-1 py-0.5">bot</code>으로 끝나야 해요).
              </li>
              <li>
                완료되면 BotFather가 <strong>토큰</strong>을 알려줘요. 그 값을 복사하세요.
              </li>
              <li>
                방금 만든 내 봇을 텔레그램에서 열고, <strong>아무 메시지나 1개</strong> 보내세요.
              </li>
              <li>아래 입력창에 토큰을 붙여넣고 &quot;연동 확인하기&quot;를 눌러주세요.</li>
            </ol>
            <TelegramConnectForm />
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900">📖 연동 매뉴얼</h2>
          <p className="mt-1 text-xs text-gray-500">
            이 프로그램에서 사용하는 발송 계정 연동 방법을 팝업창으로 열어 옆에 두고 그대로 따라 할
            수 있습니다.
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
