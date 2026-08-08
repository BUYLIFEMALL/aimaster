import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AI_PROVIDERS, PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { VoiceIdSettings } from "@/components/settings/VoiceIdSettings";

const GOOGLE_PROVIDERS = ["google_client_id", "google_client_secret"] as const;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

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
        본인의 API 키를 등록하면 최신 쇼츠 주제 수집(콘텐츠 생성) 시 등록한 키를 우선 사용.
        등록하지 않으면 앱 기본 키로 동작 (추가 등록시).
      </p>
      <div className="mb-10 space-y-3">
        {AI_PROVIDERS.filter((provider) => provider !== "json2video").map((provider) => (
          <ApiKeyRow
            key={provider}
            provider={provider}
            label={PROVIDER_LABELS[provider]}
            maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
          />
        ))}
      </div>

      <div className="mb-4">
        <ApiKeyRow
          provider="json2video"
          label={PROVIDER_LABELS.json2video}
          maskedValue={keyMap.has("json2video") ? maskApiKey(keyMap.get("json2video")!) : null}
        />
      </div>

      <h2 className="mb-2 text-lg font-bold text-neutral-900">ElevenLabs(나레이션) 연동</h2>
      <div className="mb-10">
        <VoiceIdSettings
          currentVoiceId={renderSettings?.elevenlabs_voice_id ?? null}
          currentConnectionId={renderSettings?.elevenlabs_connection_id ?? null}
        />
      </div>

      <h2 className="mb-3 text-lg font-bold text-neutral-900">🎬 YouTube 연동(Google Cloud)</h2>

      <div className="rounded-xl border border-neutral-200 p-4">
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-800">
          ⚠️ Google Cloud Console에서 반드시 <strong>YouTube Data API v3</strong>를 먼저 활성화 해주세요.
        </p>
        <p className="mb-2 text-sm text-neutral-600">
          아래 주소를 Google Cloud Console의 &ldquo;승인된 리디렉션 URI&rdquo;에 그대로 등록하세요.
        </p>
        <p className="mb-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
          <code className="font-mono">{SITE_URL}/api/youtube/callback</code>
        </p>
        <div className="space-y-3">
          {GOOGLE_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
