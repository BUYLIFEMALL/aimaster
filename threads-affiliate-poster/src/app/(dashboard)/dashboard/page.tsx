import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { dispatchScheduledPostsAction } from "@/lib/actions/posts";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import type { PostStatus } from "@/types/post";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: posts }, { data: account }, { count: productCount }, { data: program }] = await Promise.all([
    supabase
      .from("tap_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("tap_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("affiliate_products").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    // 대시보드 상단 설명 박스 — AIMaster 루트의 프로그램 소개(메인 페이지 programs.description/
    // short_desc)를 그대로 가져와 보여준다(naver-cafe-poster에서 먼저 만든 패턴, 2026-09-13).
    // 이 프로젝트의 database.types.ts는 아직 programs 테이블을 포함하지 않아(루트 공용 테이블이라
    // 타입 재생성이 안 돼 있음) 결과 타입을 직접 지정한다.
    supabase.from("programs").select("description, short_desc").eq("slug", "threads-affiliate-poster").maybeSingle() as unknown as Promise<{
      data: { description: string | null; short_desc: string | null } | null;
    }>,
  ]);

  const counts: Record<PostStatus, number> = {
    draft: 0,
    scheduled: 0,
    publishing: 0,
    published: 0,
    failed: 0,
  };
  for (const post of posts ?? []) {
    counts[post.status] += 1;
  }

  const upcoming = (posts ?? [])
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">대시보드</h1>
        <div className="flex gap-2">
          <Link href="/posts/new">
            <Button>새 게시글 작성</Button>
          </Link>
          <form action={dispatchScheduledPostsAction}>
            <Button type="submit" variant="secondary">
              예약 게시 실행
            </Button>
          </form>
        </div>
      </div>

      {(program?.description || program?.short_desc) && (
        <div className="mb-6 rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-neutral-700 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

      {/* 프로세스 분석 기반 사용방법 가이드 */}
      <div className="mb-6 rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">사용방법</h2>
        <ol className="list-inside list-decimal space-y-3 text-sm text-neutral-700">
          <li>
            <Link href="/settings" className="font-semibold text-neutral-900 underline hover:text-black">
              API키등록·플랫폼연동
            </Link>
            에서 본인 Threads 앱 ID / Threads 앱 시크릿 코드 및 AI 키(OpenAI/Gemini), 제휴 플랫폼 키(쿠팡/알리익스프레스/토스 등)를 등록하고 Threads 계정을 연결합니다. (안 쓰는 플랫폼은 등록 생략 가능)
          </li>
          <li>
            <Link href="/trends" className="font-semibold text-neutral-900 underline hover:text-black">
              트렌드 키워드 찾기
            </Link>
            에서 네이버 검색어트렌드로 요즘 뜨는 급상승 키워드를 확인하고, &quot;🔥 쿠팡 상품 자동 매칭&quot; 버튼을 눌러 소싱할 인기가 높은 상품을 빠르게 찾아봅니다.
          </li>
          <li>
            <Link href="/products" className="font-semibold text-neutral-900 underline hover:text-black">
              제휴 상품 관리
            </Link>
            에서 쿠팡 키워드 검색, 알리익스프레스 제휴 URL 자동 변환, 네이버 브랜드커넥트 및 토스 쉐어링크 상품을 등록하고 필요 시 AI 소구점 분석을 실행합니다.
          </li>
          <li>
            <Link href="/posts/new" className="font-semibold text-neutral-900 underline hover:text-black">
              게시글 작성
            </Link>
            에서 등록한 상품을 고르고 톤을 지정하면, 표시광고법 고지 문구와 제휴 링크가 자동 포함된 쓰레드 캡션을 AI가 생성합니다. 확인 후 즉시 게시하거나 예약 발행합니다.
          </li>
        </ol>
      </div>

      {!account && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Threads 계정이 연결되어 있지 않습니다.{" "}
          <Link href="/settings" className="font-medium underline">
            계정 연결하러 가기
          </Link>
        </div>
      )}
      {(productCount ?? 0) === 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          등록된 상품이 없습니다.{" "}
          <Link href="/products" className="font-medium underline">
            상품 등록하러 가기
          </Link>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.keys(counts) as PostStatus[]).map((status) => (
          <div key={status} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-semibold text-neutral-900">{counts[status]}</div>
            <div className="mt-1">
              <StatusBadge status={status} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <h2 className="text-sm font-semibold text-neutral-900">다가오는 예약 게시</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">예약된 게시글이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {upcoming.map((post) => (
              <li key={post.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <Link href={`/posts/${post.id}`} className="block truncate text-sm text-neutral-900 hover:underline">
                    {post.content}
                  </Link>
                  <p className="mt-1 text-xs text-neutral-500">
                    {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("ko-KR") : "-"}
                  </p>
                </div>
                <StatusBadge status={post.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
