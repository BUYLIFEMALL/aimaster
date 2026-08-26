import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { InstagramConnectSection } from "@/components/settings/InstagramConnectSection";
import { ReplySettingsForm } from "@/components/settings/ReplySettingsForm";
import { BotEnabledForm } from "@/components/settings/BotEnabledForm";
import { AutoApproveSettingsForm } from "@/components/settings/AutoApproveSettingsForm";
import { WebhookSetupInfo } from "@/components/settings/WebhookSetupInfo";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { ReregisterWebhookButton } from "@/components/settings/ReregisterWebhookButton";
import { getInstagramConnectionStatus } from "@/lib/actions/instagram";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { computeInstagramVerifyToken } from "@/lib/instagram/webhookSecret";
import {
  REPLY_MODEL_OPTIONS,
  DEFAULT_REPLY_MODEL,
  REPLY_MODEL_PROVIDER_SHORT_LABELS,
  getReplyModelProvider,
} from "@/lib/ai/models";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";

const META_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret"];
const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "anthropic", "gemini"];

const HELP_LINKS: Partial<Record<ApiKeyProvider, { url: string; label: string }>> = {
  meta_app_id: { url: "https://developers.facebook.com/apps", label: "Meta App Dashboard에서 발급받기" },
  meta_app_secret: { url: "https://developers.facebook.com/apps", label: "Meta App Dashboard에서 발급받기" },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "Anthropic Claude 키 발급받기" },
  gemini: { url: "https://aistudio.google.com/apikey", label: "Google Gemini 키 발급받기" },
};

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keys }, connectionStatus, { data: settings }, { data: telegramLink }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    getInstagramConnectionStatus(supabase, user.id),
    supabase
      .from("dm_settings")
      .select("default_link, ai_instructions, tone_preset, reply_model, disclosure_message, auto_approve, bot_enabled, bot_started_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "instagram-dm-reply")
      .maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  const activeModel = settings?.reply_model ?? DEFAULT_REPLY_MODEL;
  const activeModelOption = REPLY_MODEL_OPTIONS.find((o) => o.value === activeModel);
  const activeProvider = getReplyModelProvider(activeModel);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://instagram-dm-reply.vercel.app";
  const webhookCallbackUrl = `${siteUrl}/api/instagram/dm-webhook/${user.id}`;
  const webhookVerifyToken = computeInstagramVerifyToken(user.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-black text-gray-900">계정 연결 / 설정</h1>
        <p className="mb-6 text-sm text-gray-500">
          인스타그램 계정 연결과 답장 생성 AI는 서로 다른 키를 씁니다 — 아래에서 순서대로
          등록해주세요.
        </p>
      </div>

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">📸 인스타그램 계정 연결</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <p>인스타 DM 자동응답에는 본인의 Meta App ID/Secret이 필요합니다.</p>
          <p className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않습니다.</p>
          <p>
            Meta App Dashboard에서 만든 앱의 유효한 OAuth 리디렉션 URI에 아래 주소를 추가로
            등록해주셔야 합니다. 또한 그 앱의 "역할" 메뉴에서 본인 인스타그램 계정을
            테스터(tester)로 추가해두어야 App Review 없이 바로 연결할 수 있습니다.
          </p>
          <code className="block break-all rounded bg-gray-100 px-2 py-1.5 text-xs text-gray-800">
            {siteUrl}/api/instagram/callback
          </code>
          <p>인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).</p>
        </div>

        <div className="space-y-3">
          {META_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              helpUrl={HELP_LINKS[provider]?.url}
              helpLabel={HELP_LINKS[provider]?.label}
            />
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <InstagramConnectSection
            connected={connectionStatus.connected}
            username={connectionStatus.username}
            needsReconnect={connectionStatus.needsReconnect}
            bare
          />
        </div>
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">🔌 DM 웹훅 설정</h2>
        <WebhookSetupInfo callbackUrl={webhookCallbackUrl} verifyToken={webhookVerifyToken} />
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">🤖 봇 활성화</h2>
        <BotEnabledForm enabled={settings?.bot_enabled ?? false} startedAt={settings?.bot_started_at ?? null} />
      </section>

      <section className="glass-card space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">📨 텔레그램 알림 연동</h2>
        <p className="text-sm text-gray-500">
          인스타그램 계정 연결이 끊어지면 매일 자동 점검 후 텔레그램으로 알려드려요. 또한 새 DM이
          들어와 AI 답장 초안이 만들어지면 원본 메시지와 초안을 함께 보내드리고, 텔레그램에서 바로{" "}
          <strong className="text-gray-700">✅ 답변승인 / ⏸ 답변보류 / ❌ 답변제외</strong>를 선택할
          수 있어요. 다른 AIMaster 프로그램에서 이미 연동하셨어도 여기서는 별도로 연동해야 합니다.
        </p>

        {telegramLink ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.</p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={disconnectTelegramAction}>
                <button type="submit" className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
                  연동 해제
                </button>
              </form>
              <ReregisterWebhookButton />
            </div>
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

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">🔗 답장 기본 설정</h2>
        <ReplySettingsForm
          defaultLink={settings?.default_link ?? null}
          aiInstructions={settings?.ai_instructions ?? null}
          tonePreset={settings?.tone_preset ?? null}
          replyModel={settings?.reply_model ?? null}
          disclosureMessage={settings?.disclosure_message ?? null}
        />
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">🤖 답장 생성 AI</h2>
        <p className="text-sm text-gray-500">
          위 "답장 기본 설정"에서 고른 모델의 provider 키 하나만 등록되어 있으면 됩니다(세 개 다
          등록할 필요 없음).
        </p>

        <div className="space-y-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p>
            🎯 현재 답장 생성에 사용되는 모델: <strong>{activeModelOption?.shortLabel ?? activeModel}</strong>
          </p>
          <p>
            사용하는 API 키: <strong>{REPLY_MODEL_PROVIDER_SHORT_LABELS[activeProvider]}</strong>
          </p>
        </div>

        <div className="space-y-3">
          {AI_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              helpUrl={HELP_LINKS[provider]?.url}
              helpLabel={HELP_LINKS[provider]?.label}
              isActive={provider === activeProvider}
            />
          ))}
        </div>
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">⚡ 자동 발송 (선택, 고급)</h2>
        <p className="text-sm text-gray-500">
          기본적으로는 새 DM마다 AI 초안만 만들고, 실제 발송은 웹 화면이나 텔레그램 버튼에서 직접
          승인해야 합니다. 이 설정을 켜면 검토 없이 AI 초안이 바로 발송됩니다.
        </p>
        <AutoApproveSettingsForm enabled={settings?.auto_approve ?? false} />
      </section>
    </div>
  );
}
