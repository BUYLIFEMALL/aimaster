import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getInstaAccountForUser } from "@/lib/instagram/memberAccount";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { WeekReplyPanel } from "@/components/weekChart/WeekReplyPanel";
import { loadWeekDayPostsAction } from "@/lib/actions/weekPosts";
import { INSTA_SERIES, loadInstaWeek } from "@/lib/instaWeek";
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
  more: "묶음마다 최근 {n}건까지 보여요. 나머지는 각 프로그램 게시 기록에서 확인해 주세요.",
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
  // v1.44: 피드뿐 아니라 카드뉴스·AI 인플루언서·웹툰·네컷의 인스타 게시도 묶음별 색으로 함께 쌓는다(회원 본인 행만).
  const weekDays = await loadInstaWeek(user.id);

  const upcoming = (posts ?? [])
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 1. 상단 네온 선셋 HUD 헤더 & 3D 빠른 액션 바 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-[#131822] via-[#1a1424] to-[#131822] p-6 shadow-[0_4px_25px_rgba(225,48,108,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600" />
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-lg shadow-[0_4px_12px_rgba(225,48,108,0.4)] ring-2 ring-pink-500/30">
              📸
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">인스타 네온 선셋 스튜디오</h1>
            <span className="rounded-full border border-pink-500/40 bg-pink-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-pink-400">
              {APP_VERSION}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-300">
            Meta 공식 Graph API(v21.0) 기반 1:1 스마트폰 뷰파인더 피드 기획, AI 캡션·해시태그 최적화, 자동 예약 파이프라인
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/candidates"
            className="btn-3d-insta-sunset px-4 py-2.5 text-xs text-white"
          >
            <span>+ 새 게시글 기획하기</span>
          </Link>
          <form action={dispatchScheduledPostsAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0d1017] px-4 py-2.5 text-xs font-bold text-slate-200 hover:border-pink-500/50 hover:text-white transition-all shadow-sm"
            >
              <span>⚡ 예약 게시 즉시 실행</span>
            </button>
          </form>
        </div>
      </div>

      {/* 2. 4단계 인스타 크리에이터 파이프라인 인디케이터 배너 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/candidates"
          className="rounded-xl border border-pink-500/20 bg-[#131822] p-4 hover:border-pink-500/60 hover:bg-[#191f2d] transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold text-pink-400 tracking-wider">STEP 01</span>
            <span className="text-base">📰</span>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">주제 수집 레이더</div>
          <p className="mt-1 text-[11px] text-slate-400">HTTP/RSS/트렌드 소재 발굴</p>
        </Link>

        <Link
          href="/posts"
          className="rounded-xl border border-rose-500/20 bg-[#131822] p-4 hover:border-rose-500/60 hover:bg-[#191f2d] transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold text-rose-400 tracking-wider">STEP 02</span>
            <span className="text-base">✍️</span>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">AI 캡션·해시태그</div>
          <p className="mt-1 text-[11px] text-slate-400">고감도 캡션 & 태그 최적화</p>
        </Link>

        <Link
          href="/posts"
          className="rounded-xl border border-amber-500/20 bg-[#131822] p-4 hover:border-amber-500/60 hover:bg-[#191f2d] transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold text-amber-400 tracking-wider">STEP 03</span>
            <span className="text-base">📱</span>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">1:1 피드 프리뷰</div>
          <p className="mt-1 text-[11px] text-slate-400">스마트폰 뷰파인더 덱 목업</p>
        </Link>

        <Link
          href="/settings"
          className="rounded-xl border border-purple-500/20 bg-[#131822] p-4 hover:border-purple-500/60 hover:bg-[#191f2d] transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold text-purple-400 tracking-wider">STEP 04</span>
            <span className="text-base">🚀</span>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Meta 공식 자동발행</div>
          <p className="mt-1 text-[11px] text-slate-400">즉시 게시 및 24H 예약 큐</p>
        </Link>
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

      {/* 4. 4대 인스타 핵심 KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-pink-500/30 bg-[#131822] p-4.5 shadow-[0_4px_15px_rgba(225,48,108,0.1)] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-pink-400">
            <span>총 기획 콘텐츠</span>
            <span className="text-base">📝</span>
          </div>
          <div className="mt-2 text-3xl font-black text-white">{posts?.length ?? 0}<span className="text-sm font-medium text-slate-400 ml-1">건</span></div>
          <p className="mt-1 text-[11px] text-slate-400">피드 & 캐러셀 기획안 누적</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-[#131822] p-4.5 shadow-[0_4px_15px_rgba(252,176,69,0.1)] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400">
            <span>발행 예약 대기</span>
            <span className="text-base">⏰</span>
          </div>
          <div className="mt-2 text-3xl font-black text-white">{counts.scheduled}<span className="text-sm font-medium text-slate-400 ml-1">건</span></div>
          <p className="mt-1 text-[11px] text-slate-400">자동 발행 큐 예약 대기</p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-[#131822] p-4.5 shadow-[0_4px_15px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>발행 완료 성공</span>
            <span className="text-base">✅</span>
          </div>
          <div className="mt-2 text-3xl font-black text-white">{counts.published}<span className="text-sm font-medium text-slate-400 ml-1">건</span></div>
          <p className="mt-1 text-[11px] text-slate-400">인스타그램 피드 즉시/예약 발행</p>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-[#131822] p-4.5 shadow-[0_4px_15px_rgba(131,58,180,0.1)] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-purple-400">
            <span>발행 성공률 지수</span>
            <span className="text-base">🎯</span>
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {posts && posts.length > 0
              ? Math.round((counts.published / (counts.published + counts.failed || 1)) * 100)
              : 100}
            <span className="text-sm font-medium text-slate-400 ml-1">%</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Graph API 100% 무결성 관제</p>
        </div>
      </div>

      {/* 5. 1:1 정방형 스마트폰 뷰파인더 덱 목업 UI & 인스타 태그 칩셋 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-2xl border border-pink-500/30 bg-gradient-to-b from-[#131822] to-[#0e121a] p-6 shadow-xl relative overflow-hidden">
        {/* 좌측: 1:1 스마트폰 뷰파인더 덱 목업 (최근/예약 게시글) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[340px] rounded-[36px] border-4 border-slate-700 bg-black p-3.5 shadow-2xl ring-1 ring-white/10">
            {/* 상단 스피커 & 노치 */}
            <div className="mx-auto mb-3 h-4 w-28 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <div className="h-1.5 w-10 rounded-full bg-slate-700" />
            </div>

            {/* 인스타그램 인앱 피드 헤더 */}
            <div className="flex items-center justify-between px-2 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
                  <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-[10px]">
                    📸
                  </div>
                </div>
                <span className="text-xs font-bold text-white tracking-tight">buylife_official</span>
              </div>
              <span className="text-xs text-slate-400">•••</span>
            </div>

            {/* 1:1 정방형 이미지 뷰파인더 */}
            <div className="relative aspect-square w-full rounded-xl bg-gradient-to-br from-slate-900 via-[#1c1424] to-[#0f1118] border border-pink-500/20 flex flex-col items-center justify-center p-4 text-center overflow-hidden group">
              <div className="absolute inset-0 bg-radial-gradient from-pink-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="text-4xl mb-2 filter drop-shadow">📸</div>
              <div className="text-xs font-bold text-pink-300">1:1 INSTAGRAM FEED</div>
              <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 px-2">
                {upcoming[0]?.caption || posts?.[0]?.caption || "AI 고감도 캡션 및 인스타 공식 비즈니스 피드가 렌더링됩니다."}
              </p>
              <div className="mt-3 flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/15 px-3 py-1 text-[10px] font-bold text-pink-300">
                <span>LIVE 🔴 PREVIEW</span>
              </div>
            </div>

            {/* 피드 액션 아이콘들 (좋아요, 댓글, 공유, 저장) */}
            <div className="flex items-center justify-between pt-2.5 px-1">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-rose-500">❤️</span>
                <span className="text-slate-300">💬</span>
                <span className="text-slate-300">✈️</span>
              </div>
              <span className="text-slate-300 text-sm">🔖</span>
            </div>
            <div className="px-1 mt-1.5 text-[11px] font-bold text-white">좋아요 1,280개</div>
          </div>
        </div>

        {/* 우측: 30개 해시태그 최적화 칩셋 & 퀵 액션 */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">Hashtag Matrix</span>
                <h3 className="text-lg font-black text-white mt-0.5">인스타 30개 최적화 해시태그 칩셋</h3>
              </div>
              <span className="rounded-full bg-pink-500/20 border border-pink-500/40 px-2.5 py-1 text-[10px] font-extrabold text-pink-300">
                SEO MAX 30/30
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              인스타그램 공식 Explore 탭 추천 알고리즘과 피드 도달을 극대화하는 키워드 & 카테고리 태그 모음입니다.
            </p>

            {/* 해시태그 칩셋 덱 */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[
                "#인스타그램마케팅", "#피드디자인", "#SNS자동화", "#카드뉴스제작",
                "#콘텐츠크리에이터", "#마케팅꿀팁", "#온라인비즈니스", "#자동포스팅",
                "#브랜딩", "#AI콘텐츠", "#숏폼마케팅", "#인스타트렌드",
                "#크리에이터스튜디오", "#스마트스토어", "#이커머스", "#소셜마케팅",
                "#디지털노마드", "#바이럴마케팅", "#해시태그추천", "#알고리즘최적화",
                "#일러스트", "#피드꾸미기", "#인스타성장", "#게시글예약"
              ].map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-lg border border-slate-700/80 bg-[#161c28] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-pink-500/50 hover:text-pink-300 transition-colors cursor-pointer"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              💡 최신 트렌드 태그와 소재로 즉시 새 피드를 제작할 수 있습니다.
            </div>
            <Link
              href="/candidates"
              className="btn-3d-insta-sunset px-5 py-2 text-xs text-white"
            >
              소재 발굴 및 글 쓰기 →
            </Link>
          </div>
        </div>
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
        <WeekReplyPanel days={weekDays} series={INSTA_SERIES} loadDay={loadWeekDayPostsAction} classes={WEEK_PANEL_CLASSES} labels={WEEK_POST_LABELS} />
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
