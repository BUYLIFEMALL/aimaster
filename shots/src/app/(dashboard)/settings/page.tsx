import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { VoiceIdSettings } from "@/components/settings/VoiceIdSettings";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { YoutubeConnectCard } from "@/components/youtube/YoutubeConnectCard";
import { getYoutubeConnectionStatus } from "@/lib/actions/youtube";
import type { ApiKeyProvider } from "@/types/database.types";
import { Key, Radio, Film, Layers, Music, Video, ShieldCheck, ExternalLink } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

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

const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[]; icon: string }[] = [
  {
    title: "🔎 주제 수집 AI",
    description: "1단계 · 최신 쇼츠 주제 수집(트렌드 검색) 전용",
    providers: ["perplexity"],
    icon: "Perplexity Sonar",
  },
  {
    title: "📝 대본 생성 AI",
    description: "2단계 · 영상스크립트(전체 스토리 + 6장면 대사) 생성",
    providers: ["openai", "anthropic"],
    icon: "OpenAI & Claude",
  },
  {
    title: "🎨 이미지 생성 AI",
    description: "2~3단계 · 전체 스토리 생성 및 장면별 이미지(나노바나나) 생성에 함께 쓰이는 키",
    providers: ["gemini"],
    icon: "Google Gemini 2.5",
  },
  {
    title: "🎵 음악 생성",
    description: "4단계 · 배경음악 생성(Suno 기본 · ElevenLabs 선택 · Google Lyria는 위 Gemini 키 사용)",
    providers: ["suno", "elevenlabs"],
    icon: "Suno AI Music",
  },
  {
    title: "🎬 영상 렌더링",
    description: "5단계 · JSON2VIDEO로 이미지+나레이션+BGM+자막 합성",
    providers: ["json2video"],
    icon: "JSON2Video Engine",
  },
];

const GOOGLE_PROVIDERS: ApiKeyProvider[] = ["google_client_id", "google_client_secret"];
const META_PROVIDERS: ApiKeyProvider[] = ["facebook_app_id", "facebook_app_secret", "meta_app_id", "meta_app_secret"];

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const youtubeStatus = await getYoutubeConnectionStatus(supabase, user.id);

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
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* 헤더 */}
      <div className="studio-hero">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-rec-pulse" />
              <span>STUDIO CONFIG · {APP_VERSION}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Key className="w-7 h-7 text-rose-500" />
              <span>API 키 및 플랫폼 연동 설정</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              본인의 API 키를 등록하면 최신 쇼츠 주제 수집 및 영상 제작 시 등록한 키를 100% 우선 사용합니다.
            </p>
          </div>
        </div>
      </div>

      {/* BYOK 보안 원칙 */}
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 flex items-center gap-3.5 shadow-md">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
          <strong>100% BYOK 보안 원칙:</strong> 등록된 모든 키는 안전하게 암호화되어 본인 계정에만 종속되며, 외부 유출 없이 오직 쇼츠 렌더링 파이프라인에만 사용됩니다.
        </p>
      </div>

      {/* 파이프라인 단계별 API 키 섹션 */}
      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-[#202945] bg-[#13182c] p-5 shadow-xl">
            <div className="mb-3.5 flex items-center justify-between border-b border-[#202945] pb-3">
              <div>
                <h2 className="text-sm font-black text-white">{section.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
              </div>
              <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-md">
                {section.icon}
              </span>
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

      {/* 나레이션(ElevenLabs) 연동 */}
      <div className="rounded-2xl border border-[#202945] bg-[#13182c] p-5 shadow-xl">
        <div className="mb-3.5 border-b border-[#202945] pb-3">
          <h2 className="text-sm font-black text-white">🎙️ 나레이션(ElevenLabs) 연동</h2>
          <p className="text-xs text-slate-400 mt-0.5">5단계 · 영상 렌더링 시 사용할 더빙 음성 지정</p>
        </div>
        <VoiceIdSettings
          currentVoiceId={renderSettings?.elevenlabs_voice_id ?? null}
          currentConnectionId={renderSettings?.elevenlabs_connection_id ?? null}
        />
      </div>

      {/* YouTube 연동 */}
      <div className="rounded-2xl border border-[#202945] bg-[#13182c] p-5 shadow-xl space-y-4">
        <div className="border-b border-[#202945] pb-3">
          <h2 className="text-sm font-black text-white">📺 YouTube 연동 (Google Cloud)</h2>
          <p className="text-xs text-slate-400 mt-0.5">완성 영상을 유튜브 채널에 업로드하기 위한 OAuth 연동</p>
        </div>
        <div>
          <YoutubeConnectCard connected={youtubeStatus.connected} channelTitle={youtubeStatus.channelTitle} needsReconnect={youtubeStatus.needsReconnect} returnTo="/settings" />
          <p className="mt-2 text-xs text-slate-400">처음이라면 아래 Google OAuth Client ID·Secret을 먼저 등록한 뒤 「채널 연결하기」를 눌러 주세요.</p>
        </div>
        <p className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs font-semibold text-amber-300">
          ⚠️ Google Cloud Console에서 반드시 <strong>YouTube Data API v3</strong>를 먼저 활성화 해주세요.
        </p>
        <p className="text-xs text-slate-300 font-medium">
          아래 주소를 Google Cloud Console의 &ldquo;승인된 리디렉션 URI&rdquo;에 그대로 등록하세요.
        </p>
        <div className="rounded-xl border border-[#202945] bg-[#0b0d1b] p-3 text-xs text-rose-300 font-mono">
          <code>{SITE_URL}/api/youtube/callback</code>
        </div>
        <div className="space-y-3 pt-1">
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

      {/* Instagram 연동 */}
      <div className="rounded-2xl border border-[#202945] bg-[#13182c] p-5 shadow-xl space-y-4">
        <div className="border-b border-[#202945] pb-3">
          <h2 className="text-sm font-black text-white">📸 Instagram 연동 (Meta)</h2>
          <p className="text-xs text-slate-400 mt-0.5">완성 영상을 인스타그램 릴스로 업로드하기 위한 OAuth 연동</p>
        </div>
        <p className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-300/90 leading-relaxed">
          Meta 앱이 아직 개발(Development) 모드이기 때문에, 그 앱의 &quot;역할&quot; 메뉴에서
          테스터(tester)로 등록된 계정만 연결이 됩니다. 본인 명의로 Meta 앱을 직접 만들고
          아래 Facebook 앱 ID/시크릿을 등록한 뒤, 그 앱의 유효한 OAuth 리디렉션 URI에
          아래 콜백 주소를 추가하고 테스터 계정을 등록해 주세요.
        </p>
        <div className="rounded-xl border border-[#202945] bg-[#0b0d1b] p-3 text-xs text-rose-300 font-mono">
          <code>{SITE_URL}/api/instagram/callback</code>
        </div>
        <div className="space-y-3 pt-1">
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

      {/* 3D 엠보싱 연동 매뉴얼 섹션 */}
      <section className="rounded-2xl border border-[#202945] bg-[#13182c] p-5 shadow-xl">
        <div className="mb-4">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <span>📖 API 키 & 플랫폼 연동 매뉴얼</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            이 프로그램에서 사용하는 API 키·플랫폼 연동 방법을 팝업창으로 열어 옆에 두고 그대로 따라 할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {GUIDE_LINKS.map((guide) => (
            <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
          ))}
        </div>
      </section>
    </div>
  );
}
