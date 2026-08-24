import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { YoutubeConnectSection } from "@/components/settings/YoutubeConnectSection";
import { ReplySettingsForm } from "@/components/settings/ReplySettingsForm";
import { MonitoringSettingsForm } from "@/components/settings/MonitoringSettingsForm";
import { AutoApproveSettingsForm } from "@/components/settings/AutoApproveSettingsForm";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { ReregisterWebhookButton } from "@/components/settings/ReregisterWebhookButton";
import { getYoutubeConnectionStatus } from "@/lib/actions/youtube";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import {
  REPLY_MODEL_OPTIONS,
  DEFAULT_REPLY_MODEL,
  REPLY_MODEL_PROVIDER_SHORT_LABELS,
  getReplyModelProvider,
} from "@/lib/ai/models";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";

const OAUTH_PROVIDERS: ApiKeyProvider[] = ["google_client_id", "google_client_secret"];
const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "anthropic", "gemini"];

const HELP_LINKS: Partial<Record<ApiKeyProvider, { url: string; label: string }>> = {
  google_client_id: { url: "https://console.cloud.google.com/apis/credentials", label: "Google Cloud Console에서 발급받기" },
  google_client_secret: { url: "https://console.cloud.google.com/apis/credentials", label: "Google Cloud Console에서 발급받기" },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "Anthropic Claude 키 발급받기" },
  gemini: { url: "https://aistudio.google.com/apikey", label: "Google Gemini 키 발급받기" },
};

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keys }, connectionStatus, { data: settings }, { data: telegramLink }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    getYoutubeConnectionStatus(supabase, user.id),
    supabase
      .from("ytreply_settings")
      .select(
        "default_link, ai_instructions, tone_preset, reply_model, auto_approve, monitoring_enabled, monitoring_interval_minutes, monitoring_started_at, last_run_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "youtube-auto-reply")
      .maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  const activeModel = settings?.reply_model ?? DEFAULT_REPLY_MODEL;
  const activeModelOption = REPLY_MODEL_OPTIONS.find((o) => o.value === activeModel);
  const activeProvider = getReplyModelProvider(activeModel);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">채널 연결 / 설정</h1>
        <div className="mb-6 space-y-2 text-sm text-gray-500">
          <p>유튜브 댓글자동화에는 본인의 Google OAuth Client ID/Secret이 필요합니다.</p>
          <p>
            답글 초안을 만드는 AI는 OpenAI/Anthropic Claude/Google Gemini 중 아래 "답글 생성 AI
            모델"에서 고른 모델에 해당하는 provider의 키 하나만 등록되어 있으면 됩니다(세 개 다
            등록할 필요 없음).
          </p>
          <p className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않습니다.</p>
          <p>Google Cloud Console에서 만든 OAuth 클라이언트의 승인된 리디렉션 URI에 아래 주소를 추가로 등록해주셔야 합니다.</p>
          <code className="block break-all rounded bg-gray-100 px-2 py-1.5 text-xs text-gray-800">
            {process.env.NEXT_PUBLIC_SITE_URL ?? "https://youtube-auto-reply.vercel.app"}/api/youtube/callback
          </code>
          <p>
            다른 AIMaster 프로그램(유튜브 쇼츠 자동생성 등)에서 이미 Client ID/Secret을 등록하셨다면 값은
            재사용하되, 리디렉션 URI만 위 주소로 추가하시면 됩니다.
          </p>
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">유튜브 채널 연결용</p>
        <div className="space-y-3">
          {OAUTH_PROVIDERS.map((provider) => (
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

        <div className="mb-2 mt-6 space-y-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p>
            🎯 현재 답글 생성에 사용되는 모델: <strong>{activeModelOption?.shortLabel ?? activeModel}</strong>
          </p>
          <p>
            사용하는 API 키: <strong>{REPLY_MODEL_PROVIDER_SHORT_LABELS[activeProvider]}</strong>
          </p>
          <p className="text-xs text-blue-700">
            모델은 아래 "🔗 답글 기본 설정 → 답글 생성 AI 모델"에서 바꿀 수 있어요.
          </p>
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
          답글 생성 AI — 선택한 모델의 provider 키 하나만 있으면 됩니다
        </p>
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

      <YoutubeConnectSection
        connected={connectionStatus.connected}
        channelTitle={connectionStatus.channelTitle}
        needsReconnect={connectionStatus.needsReconnect}
      />

      <section className="glass-card space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">📨 텔레그램 알림 연동</h2>
        <p className="text-sm text-gray-500">
          유튜브 채널 연결이 끊어지면(구글 미검증 앱은 7일마다 만료) 매일 자동 점검 후 텔레그램으로
          알려드려요. 또한 새 댓글이 들어와 AI 답글 초안이 만들어지면 원본 댓글과 초안을 함께
          보내드리고, 텔레그램에서 바로 <strong className="text-gray-700">✅ 답변승인 / ⏸ 답변보류 / ❌ 답변제외</strong>를
          선택할 수 있어요(선택 기능). "보류"를 누르면 웹의 "댓글 검토/게시" 화면에 남아있어 나중에
          수정 후 게시할 수 있습니다. 다른 AIMaster 프로그램에서 이미 연동하셨어도 여기서는 별도로
          연동해야 합니다.
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
        <h2 className="text-lg font-bold text-gray-900">🔗 답글 기본 설정</h2>
        <ReplySettingsForm
          defaultLink={settings?.default_link ?? null}
          aiInstructions={settings?.ai_instructions ?? null}
          tonePreset={settings?.tone_preset ?? null}
          replyModel={settings?.reply_model ?? null}
        />
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">⏱ 예약 모니터링</h2>
        <MonitoringSettingsForm
          enabled={settings?.monitoring_enabled ?? false}
          intervalMinutes={settings?.monitoring_interval_minutes ?? 60}
          startedAt={settings?.monitoring_started_at ?? null}
          lastRunAt={settings?.last_run_at ?? null}
        />
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">⚡ 자동 게시 (선택, 고급)</h2>
        <p className="text-sm text-gray-500">
          기본적으로는 새 댓글마다 AI 초안만 만들고, 실제 게시는 웹 화면이나 텔레그램 버튼에서
          직접 승인해야 합니다. 이 설정을 켜면 검토 없이 AI 초안이 바로 게시됩니다.
        </p>
        <AutoApproveSettingsForm enabled={settings?.auto_approve ?? false} />
      </section>
    </div>
  );
}
