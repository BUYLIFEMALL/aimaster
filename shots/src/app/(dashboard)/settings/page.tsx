import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ALL_PROVIDERS, PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { VoiceIdSettings } from "@/components/settings/VoiceIdSettings";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: keys }, { data: renderSettings }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase
      .from("user_render_settings")
      .select("elevenlabs_voice_id, elevenlabs_connection_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-neutral-600">
        본인의 API 키를 등록하면 쇼츠 대상 수집(콘텐츠 생성) 시 등록한 키를 우선 사용합니다.
        등록하지 않으면 앱 기본 키로 동작합니다 (제공되는 경우).
      </p>
      <div className="mb-6 space-y-3">
        {ALL_PROVIDERS.map((provider) => (
          <ApiKeyRow
            key={provider}
            provider={provider}
            label={PROVIDER_LABELS[provider]}
            maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
          />
        ))}
      </div>

      <h2 className="mb-2 text-lg font-medium text-neutral-900">JSON2VIDEO 영상생성</h2>
      <VoiceIdSettings
        currentVoiceId={renderSettings?.elevenlabs_voice_id ?? null}
        currentConnectionId={renderSettings?.elevenlabs_connection_id ?? null}
      />
    </div>
  );
}
