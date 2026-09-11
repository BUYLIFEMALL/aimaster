import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsblurLogin, fetchNewsblurFeeds, type NewsblurFeedSummary } from "@/lib/ai/collector";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { CandidateCollector } from "@/components/candidates/CandidateCollector";
import { CandidateList } from "@/components/candidates/CandidateList";
import { MissingApiKeyNotice } from "@/components/settings/MissingApiKeyNotice";
import { CANDIDATE_SOURCE_LABELS, type CandidateSourceType } from "@/types/post";
import type { ApiKeyProvider } from "@/types/database.types";

const REQUIRED_PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];

export default async function CandidatesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: candidates }, { data: newsblurAccount }, registeredProviders] = await Promise.all([
    supabase
      .from("ncafe_candidates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("newsblur_accounts").select("username").eq("user_id", user.id).maybeSingle(),
    getRegisteredProviders(supabase, user.id),
  ]);

  const missingProviders = REQUIRED_PROVIDERS.filter((p) => !registeredProviders.has(p));

  const sourceCounts: Record<CandidateSourceType, number> = { http: 0, rss: 0, perplexity: 0 };
  for (const c of candidates ?? []) {
    sourceCounts[c.source_type as CandidateSourceType] += 1;
  }

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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">글감 수집</h1>
        <Link href="/drafts" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:underline">
          수집 없이 바로 글쓰기 →
        </Link>
      </div>
      <p className="mb-6 text-sm text-neutral-600">
        HTTP(특정 URL), RSS(구독 피드), Perplexity(트렌드 검색) 중 하나를 선택해서 카페에 올릴
        게시글 후보를 생성합니다.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {(Object.keys(sourceCounts) as CandidateSourceType[]).map((type) => (
          <div key={type} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-semibold text-neutral-900">{sourceCounts[type]}</div>
            <div className="mt-1 text-sm text-neutral-500">{CANDIDATE_SOURCE_LABELS[type]}로 수집</div>
          </div>
        ))}
      </div>

      <MissingApiKeyNotice missing={missingProviders} />

      <div className="mb-8">
        <CandidateCollector
          newsblurConnected={!!newsblurAccount}
          newsblurUsername={newsblurAccount?.username ?? null}
          newsblurFeeds={newsblurFeeds}
          newsblurError={newsblurError}
        />
      </div>

      <h2 className="mb-3 text-lg font-medium text-neutral-900">수집된 게시글 후보</h2>
      <CandidateList candidates={candidates ?? []} />
    </div>
  );
}
