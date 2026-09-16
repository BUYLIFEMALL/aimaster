import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsblurLogin, fetchNewsblurFeeds, type NewsblurFeedSummary } from "@/lib/ai/collector";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { CandidateCollector } from "@/components/candidates/CandidateCollector";
import { CandidateList } from "@/components/candidates/CandidateList";
import { CategoryManager } from "@/components/candidates/CategoryManager";
import { ScheduledSourceManager } from "@/components/candidates/ScheduledSourceManager";
import { MissingApiKeyNotice } from "@/components/settings/MissingApiKeyNotice";
import { CANDIDATE_SOURCE_LABELS, type CafeCategory, type CandidateSourceType, type ScheduledSource } from "@/types/post";
import type { ApiKeyProvider } from "@/types/database.types";

const REQUIRED_PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];

export default async function CandidatesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    { data: candidates },
    { data: newsblurAccount },
    registeredProviders,
    { data: scheduledSources },
    { data: targets },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("ncafe_candidates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("newsblur_accounts").select("username").eq("user_id", user.id).maybeSingle(),
    getRegisteredProviders(supabase, user.id),
    supabase
      .from("ncafe_scheduled_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("ncafe_targets").select("id, label").eq("user_id", user.id).order("created_at"),
    supabase.from("ncafe_categories").select("*").eq("user_id", user.id).order("sort_order"),
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

      <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">📖 예약 자동화 · 수집된 게시글 후보 사용법</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
          <li>
            <strong>예약 자동화 등록</strong>
            <br />
            <strong>방식 ①: 새로 수집</strong> — 아래 "글감 수집"에서 HTTP/RSS/Perplexity 중
            하나를 고른 뒤 "🔔 예약 자동화로 등록"을 켜고, 게시할 카페 · 주기 · 자동 포스팅
            여부 · (선택) 카테고리를 정해 등록합니다.
            <br />
            정해둔 주기마다 AI가 매번 새 글감을 만들어 게시합니다.
            <br />
            <br />
            <strong>방식 ②: 게시글 후보에서 예약발행</strong> — 같은 "글감 수집"에서 "🗂️
            게시글 후보에서 예약발행"을 선택해 게시할 카페 · 주기 · 자동 포스팅 여부 ·
            카테고리(복수 선택)를 정해 등록합니다.
            <br />
            새로 만들지 않고, 선택한 카테고리에 속한 "수집된 게시글 후보"(기존 + 새로
            수집되는 것 포함) 중 먼저 모인 것부터 하나씩 골라 자동으로 게시합니다.
          </li>
          <li>
            <strong>게시글 후보 "예약포스팅 포함/제외"</strong> — "수집된 게시글 후보"는
            기존에 모아둔 것과 앞으로 새로 수집되는 것 모두 기본이 "포함"이라 별도로 켤
            필요가 없습니다.
            <br />
            특정 글만 방식 ②의 자동 발행 대상에서 빼고 싶을 때만 그 후보 카드의 버튼을
            눌러 "제외됨"으로 바꿔주세요.
            <br />
            한 번 발행에 쓰인 후보는 자동으로 제외되어 중복 게시되지 않습니다.
          </li>
          <li>
            <strong>등록된 예약 자동화 관리</strong> — "🔔 등록된 예약 자동화" 목록에서 예약
            ON/OFF · 주기 · 자동 포스팅 여부를 바꾸거나 "✨ 지금 실행"으로 예약을 기다리지
            않고 즉시 1건 테스트할 수 있습니다.
            <br />
            "수정" 버튼을 누르면 등록 후에도 게시할 카페 · 카테고리 · (방식 ①만 해당) 수집
            대상을 바꿀 수 있고, 필요 없어지면 "삭제"로 지웁니다.
          </li>
          <li>
            두 방식 모두 "자동 포스팅"을 켜두면 검토 없이 바로 카페에 게시되고, 꺼두면
            초안으로 저장되어 <strong>AI 자동 글쓰기(초안)</strong>에서 검수 후 직접 배포합니다.
          </li>
        </ol>
      </div>

      <div className="mb-4">
        <CategoryManager categories={(categories ?? []) as CafeCategory[]} />
      </div>

      <div className="mb-4">
        <CandidateCollector
          newsblurConnected={!!newsblurAccount}
          newsblurUsername={newsblurAccount?.username ?? null}
          newsblurFeeds={newsblurFeeds}
          newsblurError={newsblurError}
          targets={targets ?? []}
          categories={(categories ?? []) as CafeCategory[]}
        />
      </div>

      <div className="mb-8">
        <ScheduledSourceManager
          sources={(scheduledSources ?? []) as ScheduledSource[]}
          targets={targets ?? []}
          categories={(categories ?? []) as CafeCategory[]}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium text-neutral-900">수집된 게시글 후보</h2>
        <CandidateList candidates={candidates ?? []} categories={(categories ?? []) as CafeCategory[]} />
      </div>
    </div>
  );
}
