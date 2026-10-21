import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getThreadsAccountForUser } from "@/lib/threads/memberAccount";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { WeekReplyChart } from "@/components/weekChart/WeekReplyChart";
import { bucketByKstDay } from "@/lib/weekChart/bucket";
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
    getThreadsAccountForUser(user.id).then((data) => ({ data })),
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

  // v1.76: 최근 7일(한국 시간) 게시 건수 — 공용 기준 코드 `week-reply-chart`(통합 받은편지함·댓글 프로그램과 같은 그래프).
  // 게시 시각 전용 칸이 없어, 게시 완료(published) 글의 마지막 수정 시각(updated_at, 수정 때 자동 갱신)을 게시 시각으로 쓴다.
  const weekDays = bucketByKstDay((posts ?? []).filter((p) => p.status === "published").map((p) => p.updated_at));

  const upcoming = (posts ?? [])
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">대시보드</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Threads 제휴 마케팅 현황 및 예약 포스팅 관리</p>
        </div>
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
        <div className="rounded-2xl border border-neutral-800 bg-[#1f1f1f] p-5 shadow-sm">
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-2 text-xs leading-relaxed text-neutral-300 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

      {/* 프로세스 분석 기반 사용방법 가이드 */}
      <div className="space-y-4 rounded-2xl border border-neutral-800 bg-[#1f1f1f] p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🚀 Threads 쇼핑제휴 자동화 5단계 사용 가이드</span>
          </h2>
          <span className="text-xs text-neutral-400 font-medium">쉽고 빠른 바이럴 수익화 프로세스</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2 py-0.5 text-[10px]">
                1단계
              </span>
              <span className="text-base">⚙️</span>
            </div>
            <h3 className="font-bold text-xs text-white">
              <Link href="/settings" className="hover:text-purple-400 transition-colors">
                API키 &amp; 계정 연동
              </Link>
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              OpenAI/Gemini/Claude AI 키 및 쿠팡, 알리, 토스 키 등록 후 Threads 계정을 연결합니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2 hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-2 py-0.5 text-[10px]">
                2단계
              </span>
              <span className="text-base">📦</span>
            </div>
            <h3 className="font-bold text-xs text-white">
              <Link href="/products" className="hover:text-blue-400 transition-colors">
                제휴 상품 등록
              </Link>
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              쿠팡/알리/네이버/토스 제휴 상품을 등록하면 고화질 썸네일과 제휴 URL이 자동 저장됩니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-2 py-0.5 text-[10px]">
                3단계
              </span>
              <span className="text-base">🔥</span>
            </div>
            <h3 className="font-bold text-xs text-white">
              <Link href="/trends" className="hover:text-amber-400 transition-colors">
                떡상 탐지 &amp; 페르소나
              </Link>
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Threads 키워드 검색·떡상글 직접 가져오기로 참고 글을 모으고, 10종 AI 페르소나를 선택해 캡션을 생성합니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 text-[10px]">
                4단계
              </span>
              <span className="text-base">🎨</span>
            </div>
            <h3 className="font-bold text-xs text-white">
              <Link href="/posts/new" className="hover:text-emerald-400 transition-colors">
                AI 글+카드뉴스 생성
              </Link>
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              나노바나나 AI 이미지 및 멀티컷 카드뉴스를 자동 조립하고 수동 편집하거나 즉시 생성합니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2 hover:border-neutral-600 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-bold px-2 py-0.5 text-[10px]">
                5단계
              </span>
              <span className="text-base">⚡</span>
            </div>
            <h3 className="font-bold text-xs text-white">
              <span>즉시 / 예약 게시</span>
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              `⚡ 게시물 포스팅하기`로 즉시 게시하거나 원하는 시간에 맞춰 예약 발행을 자동화합니다.
            </p>
          </div>
        </div>
      </div>

      {!account && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300">
          ⚠️ Threads 계정이 연결되어 있지 않습니다.{" "}
          <Link href="/settings" className="font-bold underline hover:text-white">
            계정 연결하러 가기 →
          </Link>
        </div>
      )}
      {(productCount ?? 0) === 0 && (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-xs text-blue-300">
          💡 등록된 제휴 상품이 없습니다.{" "}
          <Link href="/products" className="font-bold underline hover:text-white">
            상품 등록하러 가기 →
          </Link>
        </div>
      )}

      {/* 상태 통계 5개 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.keys(counts) as PostStatus[]).map((status) => (
          <div key={status} className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4">
            <div className="text-2xl font-bold text-white tracking-tight">{counts[status]}</div>
            <div className="mt-1">
              <StatusBadge status={status} />
            </div>
          </div>
        ))}
      </div>

      {/* v1.76: 최근 7일 게시 그래프 */}
      <div className="rounded-2xl border border-neutral-800 bg-[#1f1f1f] p-5 text-white">
        <WeekReplyChart days={weekDays} title="📊 최근 7일 게시" noun="게시" />
      </div>

      {/* 다가오는 예약 게시 목록 */}
      <div className="rounded-2xl border border-neutral-800 bg-[#1f1f1f] overflow-hidden">
        <div className="border-b border-neutral-800 p-4">
          <h2 className="text-xs font-bold text-white">다가오는 예약 게시</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="p-4 text-xs text-neutral-500">예약된 게시글이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-800/80">
            {upcoming.map((post) => (
              <li key={post.id} className="flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors">
                <div className="min-w-0 pr-4">
                  <Link href={`/posts/${post.id}`} className="block truncate text-xs text-neutral-200 hover:text-white font-medium">
                    {post.content}
                  </Link>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}
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
