import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { VoiceIdSettings } from "@/components/settings/VoiceIdSettings";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

// app/(main)/guides의 platform_guides.id — 이 프로그램이 실제로 쓰는 API/플랫폼에 해당하는
// 매뉴얼만 골랐다(2026-09-13, naver-cafe-poster에서 시작된 플랫폼 표준을 그대로 적용).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "0ecb9a3c-e4f7-4229-8fc3-f74fdb6dc6fd", label: "SUNO(수노) API 연동하기" },
  { guideId: "b632a359-d9fd-4e0c-8920-3283094a4892", label: "JSON2Video API 연동하기" },
  { guideId: "9457687a-75ed-40d8-bc4a-9415173eba70", label: "ElevenLabs API 연동하기" },
  { guideId: "523e7401-7393-44f5-ba45-dd437e10fa2d", label: "Google OAuth 클라이언트 만들기 (YouTube 연동)" },
  { guideId: "c3ed7fe3-00d8-466b-b4ce-9c115accb273", label: "Meta 앱 만들기 (Instagram 릴스 연동)" },
];

// 파이프라인 단계(1~5) + 나레이션/플랫폼 연동 순서로 API 키를 그룹핑해서 보여준다.
// 어떤 키가 파이프라인의 어느 단계에 쓰이는지 한눈에 구분되도록 묶는다.
const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[] }[] = [
  {
    title: "🔎 주제 수집 AI",
    description: "1단계 · 최신 쇼츠 주제 수집(트렌드 검색) 전용",
    providers: ["perplexity"],
  },
  {
    title: "📝 대본 생성 AI",
    description: "2단계 · 영상스크립트(전체 스토리 + 6장면 대사) 생성",
    providers: ["openai", "anthropic"],
  },
  {
    title: "🎨 이미지 생성 AI",
    description: "2~3단계 · 전체 스토리 생성 및 장면별 이미지(나노바나나) 생성에 함께 쓰이는 키",
    providers: ["gemini"],
  },
  {
    title: "🎵 음악 생성",
    description: "4단계 · Suno 배경음악 생성",
    providers: ["suno"],
  },
  {
    title: "🎬 영상 렌더링",
    description: "5단계 · JSON2VIDEO로 이미지+나레이션+BGM+자막 합성",
    providers: ["json2video"],
  },
];

const GOOGLE_PROVIDERS: ApiKeyProvider[] = ["google_client_id", "google_client_secret"];
const META_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret"];

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

      <div className="mb-10 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border-2 border-neutral-200 bg-white p-4 shadow-sm">
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
      </div>

      <div className="rounded-2xl border-2 border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900">🎙️ 나레이션(ElevenLabs) 연동</h2>
          <p className="text-xs text-neutral-500">5단계 · 영상 렌더링 시 사용할 더빙 음성 지정</p>
        </div>
        <VoiceIdSettings
          currentVoiceId={renderSettings?.elevenlabs_voice_id ?? null}
          currentConnectionId={renderSettings?.elevenlabs_connection_id ?? null}
        />
      </div>

      <div className="mt-5 rounded-2xl border-2 border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900">📺 YouTube 연동(Google Cloud)</h2>
          <p className="text-xs text-neutral-500">완성 영상을 유튜브 채널에 업로드하기 위한 OAuth 연동</p>
        </div>
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

      <div className="mt-5 rounded-2xl border-2 border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900">📸 Instagram 연동(Meta)</h2>
          <p className="text-xs text-neutral-500">완성 영상을 인스타그램 릴스로 업로드하기 위한 OAuth 연동</p>
        </div>
        <p className="mb-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Meta 앱이 아직 개발(Development) 모드이기 때문에, 그 앱의 &quot;역할&quot; 메뉴에서
          테스터(tester)로 등록된 계정만 연결이 됩니다. 본인 명의로 Meta 앱을 직접 만들고
          아래 두 값(Meta App ID/Secret)을 등록한 뒤, 그 앱의 유효한 OAuth 리디렉션 URI에
          아래 콜백 주소를 추가하고, &quot;역할&quot; 메뉴에서 본인 계정을 테스터로 추가해주셔야
          연결할 수 있습니다.
        </p>
        <p className="mb-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
          <code className="font-mono">{SITE_URL}/api/instagram/callback</code>
        </p>
        <div className="space-y-3">
          {META_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </div>

      <section className="mt-5 rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
          <p className="text-xs text-neutral-500">
            이 프로그램에서 사용하는 API 키·플랫폼 연동 방법을 팝업창으로 열어 옆에 두고 그대로
            따라 할 수 있습니다.
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
