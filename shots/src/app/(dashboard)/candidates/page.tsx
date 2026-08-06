import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsblurLogin, fetchNewsblurFeeds, type NewsblurFeedSummary } from "@/lib/ai/collector";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { CandidateCollector } from "@/components/candidates/CandidateCollector";
import { CandidateList } from "@/components/candidates/CandidateList";
import { MissingApiKeyNotice } from "@/components/settings/MissingApiKeyNotice";
import type { ApiKeyProvider } from "@/types/database.types";

const REQUIRED_PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];

export default async function CandidatesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: candidates }, { data: newsblurAccount }, { data: videos }, registeredProviders] =
    await Promise.all([
      supabase
        .from("shorts_candidates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("newsblur_accounts")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("shorts_videos").select("id, candidate_id").eq("user_id", user.id),
      getRegisteredProviders(supabase, user.id),
    ]);

  const videoIdByCandidateId = new Map((videos ?? []).map((v) => [v.candidate_id, v.id]));
  const missingProviders = REQUIRED_PROVIDERS.filter((p) => !registeredProviders.has(p));

  let newsblurFeeds: NewsblurFeedSummary[] = [];
  let newsblurError: string | null = null;
  if (newsblurAccount) {
    try {
      const { data: full } = await supabase
        .from("newsblur_accounts")
        .select("username, password")
        .eq("user_id", user.id)
        .single();
      const sessionCookie = await newsblurLogin(full!.username, full!.password);
      newsblurFeeds = await fetchNewsblurFeeds(sessionCookie);
    } catch (err) {
      newsblurError = err instanceof Error ? err.message : "NewsBlur 피드 목록을 불러오지 못했습니다.";
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">쇼츠 대상 수집</h1>
      <p className="mb-6 text-sm text-neutral-600">
        HTTP(특정 URL), RSS(구독 피드), Perplexity(트렌드 검색) 중 하나를 선택해서 유튜브 쇼츠 영상
        주제와 대본 초안을 생성합니다.
      </p>

      <MissingApiKeyNotice missing={missingProviders} />

      <div className="mb-8">
        <CandidateCollector
          newsblurConnected={!!newsblurAccount}
          newsblurUsername={newsblurAccount?.username ?? null}
          newsblurFeeds={newsblurFeeds}
          newsblurError={newsblurError}
        />
      </div>

      <h2 className="mb-3 text-lg font-medium text-neutral-900">수집된 쇼츠 주제</h2>
      <CandidateList candidates={candidates ?? []} videoIdByCandidateId={videoIdByCandidateId} />
    </div>
  );
}
