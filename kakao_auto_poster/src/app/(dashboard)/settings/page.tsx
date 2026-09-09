import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { KakaoAccountSection } from "@/components/settings/KakaoAccountSection";
import { SmtpAccountSection } from "@/components/settings/SmtpAccountSection";
import { SolapiAccountSection } from "@/components/settings/SolapiAccountSection";
import { TelegramSection } from "@/components/settings/TelegramSection";
import { BroadcastRecipientsSection } from "@/components/settings/BroadcastRecipientsSection";
import type { ApiKeyProvider } from "@/types/database.types";

const TELEGRAM_PROGRAM_SLUG = "kakao-auto-posting";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 성격별로 묶어서 어떤 키가 어떤 기능에 쓰이는지 한눈에 구분되도록 그룹핑한다
// (insta_auto_poster/settings/page.tsx와 동일 패턴).
const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[] }[] = [
  {
    title: "🔍 뉴스/정보 검색 AI",
    description: "관심 주제와 관련된 최신 뉴스/정책/트렌드를 실시간으로 검색하는 데 쓰입니다. 필수입니다.",
    providers: ["perplexity"],
  },
  {
    title: "✍️ 콘텐츠 생성 AI",
    description: "검색된 정보를 카카오톡 발송용 요약과 웹 리포트 본문으로 정리하는 데 쓰입니다. 필수입니다.",
    providers: ["openai", "anthropic"],
  },
  {
    title: "🎨 이미지 생성 AI",
    description: "리포트를 생성할 때마다 주제에 맞는 대표 이미지를 함께 만드는 데 쓰입니다. 필수입니다.",
    providers: ["gemini"],
  },
];

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: keys }, { data: kakaoAccount }, { data: smtpAccount }, { data: solapiAccount }, { data: telegramLink }, { data: broadcastRecipients }] =
    await Promise.all([
      supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
      supabase.from("user_kakao_accounts").select("nickname").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("user_smtp_accounts")
        // 다른 프로그램에서 이미 여러 개(예: Gmail+네이버) 등록해둔 경우를 대비해 배열로
        // 받는다 — .maybeSingle()은 행이 2개 이상이면 에러를 던진다.
        .select("id, smtp_host, smtp_port, smtp_user, from_name, is_active, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_solapi_accounts")
        .select("api_key, sender_phone, kakao_pf_id, rcs_brand_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_telegram_links")
        .select("bot_username")
        .eq("user_id", user.id)
        .eq("program_slug", TELEGRAM_PROGRAM_SLUG)
        .maybeSingle(),
      supabase
        .from("kakao_broadcast_recipients")
        .select("id, phone, label")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-neutral-600">
        정보 콘텐츠 생성 기능 사용 전 본인의 API 키를 등록해야 합니다.
      </p>
      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-neutral-900">{section.title}</h2>
              <p className="text-xs text-neutral-500">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.providers.map((provider) => (
                <ApiKeyRow
                  key={provider}
                  provider={provider}
                  label={PROVIDER_LABELS[provider]}
                  maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <KakaoAccountSection account={kakaoAccount ?? null} />
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <SolapiAccountSection account={solapiAccount ?? null} />
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <BroadcastRecipientsSection
            recipients={broadcastRecipients ?? []}
            hasSolapiChannel={Boolean(solapiAccount?.kakao_pf_id)}
          />
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <SmtpAccountSection accounts={smtpAccount ?? []} />
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <TelegramSection link={telegramLink ?? null} />
        </div>
      </div>
    </div>
  );
}
