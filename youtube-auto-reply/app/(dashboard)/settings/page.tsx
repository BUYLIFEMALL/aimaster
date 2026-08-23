import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { YoutubeConnectSection } from "@/components/settings/YoutubeConnectSection";
import { ReplySettingsForm } from "@/components/settings/ReplySettingsForm";
import { getYoutubeConnectionStatus } from "@/lib/actions/youtube";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";

const PROVIDERS: ApiKeyProvider[] = ["google_client_id", "google_client_secret", "openai"];

const HELP_LINKS: Partial<Record<ApiKeyProvider, { url: string; label: string }>> = {
  google_client_id: { url: "https://console.cloud.google.com/apis/credentials", label: "Google Cloud Console에서 발급받기" },
  google_client_secret: { url: "https://console.cloud.google.com/apis/credentials", label: "Google Cloud Console에서 발급받기" },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
};

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keys }, connectionStatus, { data: settings }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    getYoutubeConnectionStatus(supabase, user.id),
    supabase.from("ytreply_settings").select("default_link, ai_instructions").eq("user_id", user.id).maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">채널 연결 / 설정</h1>
        <p className="mb-6 text-sm text-gray-500">
          유튜브 댓글 자동 답글에는 본인의 Google OAuth Client ID/Secret과 OpenAI 키가 필요합니다.
          <span className="font-semibold text-gray-900"> 앱(관리자) 공용 키로 대신 동작하지 않습니다.</span>{" "}
          Google Cloud Console에서 만든 OAuth 클라이언트의 승인된 리디렉션 URI에{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            {process.env.NEXT_PUBLIC_SITE_URL ?? "https://youtube-auto-reply.vercel.app"}/api/youtube/callback
          </code>
          을 추가로 등록해주셔야 합니다. 다른 AIMaster 프로그램(유튜브 쇼츠 자동생성 등)에서 이미
          Client ID/Secret을 등록하셨다면 값은 재사용하되, 리디렉션 URI만 위 주소로 추가하시면 됩니다.
        </p>
        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
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
      </section>

      <YoutubeConnectSection
        connected={connectionStatus.connected}
        channelTitle={connectionStatus.channelTitle}
        needsReconnect={connectionStatus.needsReconnect}
      />

      <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">🔗 답글 기본 설정</h2>
        <ReplySettingsForm defaultLink={settings?.default_link ?? null} aiInstructions={settings?.ai_instructions ?? null} />
      </section>
    </div>
  );
}
