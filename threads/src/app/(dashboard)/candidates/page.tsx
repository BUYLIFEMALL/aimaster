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

      {/* 프로세스 분석 기반 사용방법 가이드 박스 */}
      <div className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">📖 게시글 주제 수집 및 카테고리 분류 사용법</h2>
        <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-neutral-700">
          <li>
            <strong>🗂️ 카테고리 관리</strong> — 상단의 <strong>[⚙️ 카테고리 추가·수정·삭제]</strong> 버튼을 눌러 쓰레드 콘텐츠 주제별 카테고리(예: IT/트렌드, 리빙, 비즈니스 등)를 자유롭게 생성하고 순서를 정리합니다.
          </li>
          <li>
            <strong>🔍 3가지 글감 수집 방식</strong> — 
            <br />
            • <strong>HTTP (URL 지정)</strong>: 원하는 웹사이트/블로그/뉴스 URL에서 글감 본문을 추출하여 쓰레드 주제로 변환합니다.
            <br />
            • <strong>RSS (NewsBlur)</strong>: 구독 중인 RSS 피드의 최신 소식에서 바이럴 주제를 수집합니다.
            <br />
            • <strong>Perplexity (트렌드 검색)</strong>: 입력한 키워드의 최신 트렌딩 앵글과 핫이슈를 AI가 실시간 탐색합니다.
          </li>
          <li>
            <strong>📂 수집 시 카테고리 지정</strong> — 수집 도구 상단의 <strong>&quot;저장할 카테고리&quot;</strong> 드롭다운에서 미리 카테고리를 선택하면, 생성되는 모든 주제 후보가 해당 카테고리로 자동 분류되어 저장됩니다.
          </li>
          <li>
            <strong>⚡ 수집된 주제 분류 및 글쓰기</strong> — 아래 수집 목록에서 카테고리 필터 탭으로 분류해서 보거나, 체크박스로 다중 선택하여 카테고리를 일괄 이동시킬 수 있습니다. 원하는 주제의 <strong>[이 주제로 글쓰기]</strong> 버튼을 누르면 AI 캡션이 채워진 포스트 작성 화면으로 즉시 이동합니다.
          </li>
        </ol>
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
