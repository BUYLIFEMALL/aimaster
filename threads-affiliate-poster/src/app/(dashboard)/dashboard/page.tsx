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
      <div className="mb-6 space-y-4 rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <span>🚀 Threads 쇼핑제휴 자동화 5단계 사용 가이드</span>
          </h2>
          <span className="text-xs text-neutral-500 font-medium">쉽고 빠른 바이럴 수익화 프로세스</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-purple-100 text-purple-700 font-bold px-2 py-0.5 text-[10px]">
                1단계
              </span>
              <span className="text-base">⚙️</span>
            </div>
            <h3 className="font-bold text-xs text-neutral-900">
              <Link href="/settings" className="hover:underline text-purple-700">
                API키 &amp; 계정 연동
              </Link>
            </h3>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              OpenAI/Gemini/Claude AI 키 및 쿠팡, 알리, 토스 키 등록 후 Threads 계정을 연결합니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-100 text-blue-700 font-bold px-2 py-0.5 text-[10px]">
                2단계
              </span>
              <span className="text-base">📦</span>
            </div>
            <h3 className="font-bold text-xs text-neutral-900">
              <Link href="/products" className="hover:underline text-blue-700">
                제휴 상품 등록
              </Link>
            </h3>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              쿠팡/알리/네이버/토스 제휴 상품을 등록하면 고화질 썸네일과 제휴 URL이 자동 저장됩니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[10px]">
                3단계
              </span>
              <span className="text-base">🔥</span>
            </div>
            <h3 className="font-bold text-xs text-neutral-900">
              <Link href="/trends" className="hover:underline text-amber-800">
                떡상 탐지 &amp; 페르소나
              </Link>
            </h3>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              실시간 바이럴 떡상글 탐지 &amp; 10종 AI 페르소나(자취러, 쇼핑에디터 등)를 선택해 캡션을 생성합니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
                4단계
              </span>
              <span className="text-base">🎨</span>
            </div>
            <h3 className="font-bold text-xs text-neutral-900">
              <Link href="/posts/new" className="hover:underline text-emerald-800">
                AI 글+카드뉴스 생성
              </Link>
            </h3>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              나노바나나 AI 이미지 및 멀티컷 카드뉴스를 자동 조립하고 수동 편집하거나 즉시 생성합니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-neutral-200 text-neutral-800 font-bold px-2 py-0.5 text-[10px]">
                5단계
              </span>
              <span className="text-base">⚡</span>
            </div>
            <h3 className="font-bold text-xs text-neutral-900">
              <span>즉시 / 예약 게시</span>
            </h3>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              `⚡ 게시물 포스팅하기`로 즉시 게시하거나 원하는 시간에 맞춰 예약 발행을 자동화합니다.
            </p>
          </div>
        </div>
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
