import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { getYoutubeConnectionStatus } from "@/lib/actions/youtube";
import { ScriptEditor } from "@/components/candidates/ScriptEditor";
import { BgmSection } from "@/components/candidates/BgmSection";
import { RenderSection } from "@/components/candidates/RenderSection";
import { PostingSection } from "@/components/candidates/PostingSection";
import { MissingApiKeyNotice } from "@/components/settings/MissingApiKeyNotice";
import type { ApiKeyProvider } from "@/types/database.types";

const REQUIRED_PROVIDERS: ApiKeyProvider[] = ["gemini", "openai", "suno", "json2video"];

export default async function ScriptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: videoId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: video } = await supabase
    .from("shorts_videos")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .maybeSingle();

  if (!video) notFound();

  const [
    { data: segments },
    { data: bgmTracks },
    { data: renderSettings },
    registeredProviders,
    youtubeStatus,
    { data: instagramAccount },
  ] = await Promise.all([
    supabase
      .from("shorts_video_segments")
      .select("*")
      .eq("user_id", user.id)
      .eq("video_id", video.id)
      .order("segment_index", { ascending: true }),
    supabase
      .from("shorts_bgm_tracks")
      .select("*")
      .eq("user_id", user.id)
      .eq("video_id", video.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_render_settings")
      .select("elevenlabs_voice_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    getRegisteredProviders(supabase, user.id),
    getYoutubeConnectionStatus(supabase, user.id),
    supabase.from("instagram_accounts").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const missingProviders = REQUIRED_PROVIDERS.filter((p) => !registeredProviders.has(p));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">영상스크립트 생성 결과</h1>
      <p className="mb-6 text-sm text-neutral-600">
        생성된 스크립트와 장면별 대사·이미지 프롬프트를 확인하고 필요하면 수정하세요. 수정 후
        저장하면 그 내용으로 이미지가 생성됩니다.
      </p>
      <MissingApiKeyNotice missing={missingProviders} />
      <ScriptEditor video={video} segments={segments ?? []} />
      <div className="mt-6">
        <BgmSection video={video} tracks={bgmTracks ?? []} />
      </div>
      <div className="mt-6">
        <RenderSection video={video} defaultVoiceId={renderSettings?.elevenlabs_voice_id ?? null} />
      </div>
      <div className="mt-6">
        <PostingSection
          video={video}
          youtubeConnected={youtubeStatus.connected}
          youtubeNeedsReconnect={youtubeStatus.needsReconnect}
          instagramAccount={instagramAccount ?? null}
        />
      </div>
    </div>
  );
}
