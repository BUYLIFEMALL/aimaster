import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsblurLogin, fetchNewsblurFeeds, type NewsblurFeedSummary } from "@/lib/ai/collector";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { CandidateCollector } from "@/components/candidates/CandidateCollector";
import { CandidateList } from "@/components/candidates/CandidateList";
import { MissingApiKeyNotice } from "@/components/settings/MissingApiKeyNotice";
import type { ApiKeyProvider, InstaSourceType } from "@/types/database.types";

const REQUIRED_PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];

const SOURCE_LABELS: Record<InstaSourceType, string> = {
  http: "HTTP",
  rss: "RSS",
  perplexity: "Perplexity",
};

export default async function CandidatesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: candidates }, { data: newsblurAccount }, registeredProviders] = await Promise.all([
    supabase
      .from("insta_candidates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("newsblur_accounts").select("username").eq("user_id", user.id).maybeSingle(),
    getRegisteredProviders(supabase, user.id),
  ]);

  const missingProviders = REQUIRED_PROVIDERS.filter((p) => !registeredProviders.has(p));

  const sourceCounts: Record<InstaSourceType, number> = { http: 0, rss: 0, perplexity: 0 };
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-[#131822] via-[#1a1424] to-[#131822] p-6 shadow-[0_4px_25px_rgba(225,48,108,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600" />
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-lg shadow-[0_4px_12px_rgba(225,48,108,0.4)] ring-2 ring-pink-500/30">
            📰
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">게시글 주제 수집</h1>
            <p className="mt-1 text-xs text-slate-300">
              HTTP(특정 URL), RSS(구독 피드), Perplexity(실시간 트렌드 검색)를 통해 인스타그램에 올릴 주제를 발굴합니다.
            </p>
          </div>
        </div>
        <Link href="/posts/new" className="btn-3d-insta-sunset px-4 py-2 text-xs text-white">
          <span>수집 없이 바로 글쓰기 →</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {(Object.keys(sourceCounts) as InstaSourceType[]).map((type) => (
          <div key={type} className="rounded-xl border border-pink-500/20 bg-[#131822] p-4.5 shadow-sm">
            <div className="text-2xl font-black text-white">{sourceCounts[type]}<span className="text-xs font-normal text-slate-400 ml-1">건</span></div>
            <div className="mt-1 text-xs font-semibold text-pink-400">{SOURCE_LABELS[type]} 레이더 수집</div>
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

      <h2 className="mb-3 text-lg font-medium text-neutral-900">수집된 게시글 주제</h2>
      <CandidateList candidates={candidates ?? []} />
    </div>
  );
}
