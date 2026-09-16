import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsblurLogin, fetchNewsblurFeeds, type NewsblurFeedSummary } from "@/lib/ai/collector";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { CandidateCollector } from "@/components/candidates/CandidateCollector";
import { CandidateList } from "@/components/candidates/CandidateList";
import { CategoryManager } from "@/components/candidates/CategoryManager";
import { MissingApiKeyNotice } from "@/components/settings/MissingApiKeyNotice";
import type { ApiKeyProvider, ThreadsSourceType } from "@/types/database.types";
import type { ThreadsCategory } from "@/types/post";

const REQUIRED_PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SOURCE_LABELS: Record<ThreadsSourceType, string> = {
  http: "HTTP",
  rss: "RSS",
  perplexity: "Perplexity",
};

export default async function CandidatesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: candidates }, { data: newsblurAccount }, registeredProviders, { data: categoriesData }] = await Promise.all([
    supabase
      .from("threads_candidates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("newsblur_accounts").select("username").eq("user_id", user.id).maybeSingle(),
    getRegisteredProviders(supabase, user.id),
    supabase
      .from("threads_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }) as unknown as Promise<{ data: ThreadsCategory[] | null }>,
  ]);

  const categories: ThreadsCategory[] = categoriesData ?? [];
  const missingProviders = REQUIRED_PROVIDERS.filter((p) => !registeredProviders.has(p));

  const sourceCounts: Record<ThreadsSourceType, number> = { http: 0, rss: 0, perplexity: 0 };
  for (const c of candidates ?? []) {
    sourceCounts[c.source_type] += 1;
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-neutral-900">게시글 주제 수집 및 분류</h1>
          <Link href="/posts/new" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:underline">
            수집 없이 바로 글쓰기 →
          </Link>
        </div>
        <p className="text-sm text-neutral-600">
          HTTP(특정 URL), RSS(구독 피드), Perplexity(트렌드 검색) 중 하나를 선택해서 Threads에 올릴
          게시글 주제와 초안을 생성하고 카테고리별로 분류 관리합니다.
        </p>
      </div>

      <CategoryManager categories={categories} />

      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(sourceCounts) as ThreadsSourceType[]).map((type) => (
          <div key={type} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-semibold text-neutral-900">{sourceCounts[type]}</div>
            <div className="mt-1 text-sm text-neutral-500">{SOURCE_LABELS[type]}로 수집</div>
          </div>
        ))}
      </div>

      <MissingApiKeyNotice missing={missingProviders} />

      <div>
        <CandidateCollector
          newsblurConnected={!!newsblurAccount}
          newsblurUsername={newsblurAccount?.username ?? null}
          newsblurFeeds={newsblurFeeds}
          newsblurError={newsblurError}
          categories={categories}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-neutral-900">수집된 게시글 주제 ({candidates?.length ?? 0}건)</h2>
        <CandidateList candidates={candidates ?? []} categories={categories} />
      </div>
    </div>
  );
}
