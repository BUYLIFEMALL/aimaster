import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getInstaAccountForUser } from "@/lib/instagram/memberAccount";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { WeekReplyPanel } from "@/components/weekChart/WeekReplyPanel";
import { loadWeekDayPostsAction } from "@/lib/actions/weekPosts";
import { bucketByKstDay } from "@/lib/weekChart/bucket";
import { dispatchScheduledPostsAction } from "@/lib/actions/posts";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { APP_VERSION } from "@/lib/version";
import type { PostStatus } from "@/types/post";

// 2026-10-22: 막대 누르면 그날 게시한 글 목록(공용 기준 코드 `week-reply-panel`) 색·문구
const WEEK_PANEL_CLASSES = { border: "border-[#262c3d]", item: "bg-[#11141c]", muted: "text-slate-400", danger: "text-red-400" };
const WEEK_POST_LABELS = {
  title: "📊 최근 7일 게시",
  noun: "게시",
  list: "게시한 글 목록",
  empty: "이날 게시한 글이 없어요.",
  more: "최근 {n}건까지 보여요. 나머지는 게시글 목록에서 확인해 주세요.",
  replyIcon: "📝",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: posts }, { data: account }] = await Promise.all([
    supabase
      .from("insta_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    getInstaAccountForUser(supabase, user.id).then((data) => ({ data })),
  ]);

  // 대시보드 상단 설명 박스 — AIMaster 루트의 프로그램 소개(메인 페이지 programs.description/
  // short_desc)를 그대로 가져와 보여준다(2026-09-13 요청, naver-cafe-poster 패턴 확대 적용).
  // "programs" 테이블은 이 프로젝트의 로컬 database.types.ts에 없어(공용 테이블이라 다른
  // 서브프로젝트 스키마 생성 시점엔 빠져있었음) 타입 단언으로 우회한다.
  const { data: program } = (await supabase
    .from("programs")
    .select("description, short_desc")
    .eq("slug", "auto-instagram-posting")
    .maybeSingle()) as unknown as { data: { description: string | null; short_desc: string | null } | null };

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

  // v1.43: 최근 7일(한국 시간) 게시 건수 — 공용 기준 코드 `week-reply-chart`(통합 받은편지함·댓글 프로그램과 같은 그래프).
  // 2026-10-22부터 게시한 시각(published_at, 게시 완료 때 기록·기존 글은 그때의 updated_at으로 채움)을 쓴다. 비어 있으면 updated_at.
  const weekDays = bucketByKstDay((posts ?? []).filter((p) => p.status === "published").map((p) => p.published_at ?? p.updated_at));

  const upcoming = (posts ?? [])
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 1. 상단 헤더 & 빠른 액션 바 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#262c3d] bg-[#161922] p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-base shadow-sm">
              📸
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">대시보드</h1>
            <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-[11px] font-bold text-pink-400">
              {APP_VERSION}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            인스타그램 피드 및 캐러셀 콘텐츠의 자동 기획, AI 생성, 예약 발행 현황을 한눈에 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/candidates"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            <span>+ 새 게시글 작성</span>
          </Link>
          <form action={dispatchScheduledPostsAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#262c3d] bg-[#0d0f17] px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#1f2433] hover:text-white transition-colors"
            >
              <span>⚡ 예약 게시 즉시 실행</span>
            </button>
          </form>
        </div>
      </div>

      {/* 2. 프로그램 소개 배너 */}
      {program && (program.description || program.short_desc) && (
        <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-5 shadow-xs">
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-2 text-xs leading-relaxed text-slate-300 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

      {/* 3. 인스타그램 계정 미연동 알림 */}
      {!account && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>인스타그램 비즈니스/크리에이터 계정이 아직 연결되어 있지 않습니다.</span>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1 font-bold text-amber-200 hover:bg-amber-500/30 transition-colors"
          >
            계정 연결하러 가기 →
          </Link>
        </div>
      )}

      {/* 4. 5단계 파이프라인 가이드 바로가기 바 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/candidates"
          className="rounded-xl border border-[#262c3d] bg-[#161922] p-4 hover:border-pink-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-200 group-hover:text-pink-300">1. 주제 수집</span>
            <span>📰</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">HTTP/RSS/트렌드 글감 수집</p>
        </Link>

        <Link
          href="/posts"
          className="rounded-xl border border-[#262c3d] bg-[#161922] p-4 hover:border-pink-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-200 group-hover:text-pink-300">2. AI 포스팅 생성</span>
            <span>🎨</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">캡션·해시태그·나노바나나</p>
        </Link>

        <Link
          href="/settings"
          className="rounded-xl border border-[#262c3d] bg-[#161922] p-4 hover:border-pink-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-200 group-hover:text-pink-300">3. Meta 계정 연동</span>
            <span>🔑</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Facebook/Instagram 방식</p>
        </Link>

        <Link
          href="/guide"
          className="rounded-xl border border-pink-500/30 bg-gradient-to-tr from-pink-500/10 to-purple-600/10 p-4 hover:border-pink-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-pink-300">4. 사용 매뉴얼</span>
            <span>📖</span>
          </div>
          <p className="mt-1 text-[11px] text-pink-400/80">5단계 가이드 & 알고리즘 팁</p>
        </Link>
      </div>

      {/* 5. 5종 포스팅 상태 요약 카운터 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.keys(counts) as PostStatus[]).map((status) => (
          <div key={status} className="rounded-xl border border-[#262c3d] bg-[#161922] p-4 shadow-xs">
            <div className="text-2xl font-bold text-slate-100">{counts[status]}</div>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
        ))}
      </div>

      {/* v1.43: 최근 7일 게시 그래프 */}
      <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-5 text-slate-100 shadow-xs">
        <WeekReplyPanel days={weekDays} loadDay={loadWeekDayPostsAction} classes={WEEK_PANEL_CLASSES} labels={WEEK_POST_LABELS} />
      </div>

      {/* 6. 다가오는 예약 게시 목록 */}
      <div className="rounded-2xl border border-[#262c3d] bg-[#161922] overflow-hidden shadow-xs">
        <div className="border-b border-[#262c3d] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100">📅 다가오는 예약 게시 목록</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-mono">
              {upcoming.length}건
            </span>
          </div>
          <Link href="/posts" className="text-xs text-pink-400 hover:text-pink-300 font-medium">
            전체 보기 →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <p>현재 예약된 게시글이 없습니다.</p>
            <p className="mt-1">새 게시글을 작성하고 원하는 시각에 예약해 보세요!</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#262c3d]">
            {upcoming.map((post) => (
              <li key={post.id} className="flex items-center justify-between p-4 hover:bg-[#1a1f2e] transition-colors">
                <div className="min-w-0 pr-4">
                  <Link href={`/posts/${post.id}`} className="block truncate text-xs font-semibold text-slate-200 hover:text-pink-400 transition-colors">
                    {post.caption || "(내용 없음)"}
                  </Link>
                  <p className="mt-1 text-[11px] font-mono text-slate-400">
                    ⏰ {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}
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
