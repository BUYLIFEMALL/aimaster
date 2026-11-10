import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getNaverAccount } from "@/lib/naver/memberAccount";
import { resolveApiKey as resolveNaverKey } from "@/lib/apiKeys";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { APP_VERSION } from "@/lib/version";
import type { PostStatus } from "@/types/post";
import { 
  Sparkles, 
  BookOpen, 
  Search, 
  ShieldCheck, 
  ExternalLink, 
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle
} from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: posts }, { data: account }, { count: targetCount }, { data: program }] = await Promise.all([
    supabase
      .from("ncafe_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    (async () => ({ data: await getNaverAccount(supabase, user.id, await resolveNaverKey(supabase, user.id, "naver_client_id")).then((a) => (a ? { naver_id: a.naver_id, nickname: a.nickname } : null)) }))(),
    supabase.from("ncafe_targets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("programs").select("description, short_desc").eq("slug", "naver-cafe-poster").maybeSingle(),
  ]);

  const counts: Record<PostStatus, number> = {
    draft: 0,
    publishing: 0,
    published: 0,
    failed: 0,
  };
  for (const post of posts ?? []) {
    counts[post.status as PostStatus] += 1;
  }

  const recent = (posts ?? []).slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* 상단 시그니처 히어로 배너 */}
      <div className="studio-hero rounded-2xl p-6 sm:p-8 border border-[#1E293B]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] px-3 text-xs font-bold text-slate-950 shadow-xs">
                <span>☕</span> 네이버 카페 포스팅 자동화
              </span>
              <span className="rounded-full bg-emerald-950/70 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                {APP_VERSION} 퀀트 바이럴 레이더
              </span>
              <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
                100% BYOK 보안
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              실시간 글감 수집부터 AI 초안, 예약 발행까지 <span className="text-emerald-400">퀀트 자동화</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
              URL·RSS·Perplexity로 실시간 인기 주제를 자동 탐지하고, 네이버 카페 특유의 호응을 유도하는 최적화 본문을 생성하여 카페 게시판으로 안전하게 발행합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Link
              href="/guide"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition-all"
            >
              <BookOpen className="h-4 w-4" />
              <span>📖 연동 & 사용 매뉴얼</span>
            </Link>
            <Link
              href="/drafts"
              className="btn-3d px-5 py-3 text-sm font-extrabold flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI 자동 글쓰기 (초안)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 공식 프로그램 소개 문구 확장 */}
        {(program?.description || program?.short_desc) && (
          <div className="mt-6 rounded-xl border border-[#1E293B] bg-[#070A12]/80 p-4 text-xs sm:text-sm text-slate-300 space-y-1.5 leading-relaxed">
            {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
              <p key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold mt-0.5">•</span>
                <span>{sentence}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 연동 경고 배너 */}
      {!account && (
        <div className="flex items-start sm:items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-950/40 p-4 text-sm text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">네이버 계정이 아직 연동되지 않았습니다.</p>
              <p className="text-xs text-amber-300 mt-0.5">네이버 카페 API를 통해 글을 발행하려면 본인 네이버 계정 연결이 필요합니다.</p>
            </div>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition-colors"
          >
            계정 연동하기 →
          </Link>
        </div>
      )}

      {(targetCount ?? 0) === 0 && (
        <div className="flex items-start sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-200 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">등록된 카페 게시판이 없습니다.</p>
              <p className="text-xs text-emerald-300 mt-0.5">글을 게시할 네이버 카페의 고유 ID(club_id)와 게시판 번호(menu_id)를 등록해주세요.</p>
            </div>
          </div>
          <Link
            href="/settings"
            className="btn-3d px-3.5 py-1.5 text-xs font-bold"
          >
            카페 등록하기 →
          </Link>
        </div>
      )}

      {/* 3대 핵심 KPI 기능 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
              <Search className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 1</span>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-100">3대 소스 글감 자동 수집</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            원하는 웹 URL 분석, NewsBlur RSS 피드, Perplexity 실시간 트렌드 검색으로 풍성한 글감을 한 번에 모읍니다.
          </p>
          <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <Link href="/candidates" className="hover:underline flex items-center gap-1">
              <span>글감 수집 바로가기</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="stat-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950/70 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 2-3</span>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-100">카페 맞춤 AI 초안 생성</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            카페 회원들의 호응을 이끌어내는 친근한 구어체 어투와 매력적인 제목, 본문, 관련 해시태그를 자동 생성합니다.
          </p>
          <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs text-cyan-400 font-semibold">
            <Link href="/drafts" className="hover:underline flex items-center gap-1">
              <span>초안 보관함 바로가기</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="stat-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/70 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 4</span>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-100">네이버 공식 API 안전 발행</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            비정상 매크로 방식이 아닌 네이버 공식 Cafe API(OAuth 2.0)를 통해 안전하게 예약 및 즉시 포스팅을 수행합니다.
          </p>
          <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs text-purple-400 font-semibold">
            <Link href="/posts" className="hover:underline flex items-center gap-1">
              <span>게시글 관리 바로가기</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 상태별 게시글 통계 카드 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>📊</span> 게시글 진행 현황
          </h2>
          <Link href="/posts" className="text-xs font-semibold text-emerald-400 hover:underline">
            전체 목록 보기 →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-[#1E293B] bg-[#0F1523] p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">초안 저장</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-100">{counts.draft}</div>
            <div className="mt-1.5"><StatusBadge status="draft" /></div>
          </div>

          <div className="rounded-2xl border border-[#1E293B] bg-[#0F1523] p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">발행 진행중</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-400">{counts.publishing}</div>
            <div className="mt-1.5"><StatusBadge status="publishing" /></div>
          </div>

          <div className="rounded-2xl border border-[#1E293B] bg-[#0F1523] p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">발행 완료</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-400">{counts.published}</div>
            <div className="mt-1.5"><StatusBadge status="published" /></div>
          </div>

          <div className="rounded-2xl border border-[#1E293B] bg-[#0F1523] p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">발행 실패</span>
              <AlertCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-400">{counts.failed}</div>
            <div className="mt-1.5"><StatusBadge status="failed" /></div>
          </div>
        </div>
      </div>

      {/* 최근 게시글 5건 */}
      {recent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>📋</span> 최근 등록된 게시글
            </h2>
            <Link href="/posts" className="text-xs font-semibold text-emerald-400 hover:underline">
              더보기 →
            </Link>
          </div>

          <div className="rounded-2xl border border-[#1E293B] bg-[#0F1523] overflow-hidden shadow-xs divide-y divide-[#1E293B]">
            {recent.map((post) => (
              <div key={post.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#151D30] transition-colors">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={post.status as PostStatus} />
                    <span className="text-xs text-slate-400">
                      {new Date(post.created_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 truncate max-w-xl">
                    {post.title || "(제목 없음)"}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1 max-w-2xl">
                    {post.content}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0">
                  <Link
                    href={`/posts/${post.id}`}
                    className="rounded-lg border border-[#1E293B] bg-[#151D30] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    상세보기
                  </Link>
                  {post.cafe_article_url && (
                    <a
                      href={post.cafe_article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/70 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/50 transition-colors"
                    >
                      <span>카페글 열기</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 하단 4단계 플로우 가이드 카드 요약 */}
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F1523] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B] pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>🚀</span> 네이버 카페 4단계 포스팅 워크플로우
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">처음 사용하시는 분을 위한 단계별 진행 안내</p>
          </div>
          <Link
            href="/guide"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:underline"
          >
            <span>상세 매뉴얼 및 FAQ 보기</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#070A12] p-4 border border-[#1E293B] space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-slate-950 text-xs font-bold">1</span>
              <span className="text-xs font-bold text-slate-100">플랫폼 & 카페 연동</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              [API키등록·플랫폼연동] 메뉴에서 네이버 계정을 연동하고 올릴 카페의 club_id와 menu_id를 등록합니다.
            </p>
          </div>

          <div className="rounded-xl bg-[#070A12] p-4 border border-[#1E293B] space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-slate-950 text-xs font-bold">2</span>
              <span className="text-xs font-bold text-slate-100">게시글 주제 수집</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              URL 직접 지정, NewsBlur RSS 피드, Perplexity 트렌드 검색을 통해 카페에 올릴 최신 글감을 수집합니다.
            </p>
          </div>

          <div className="rounded-xl bg-[#070A12] p-4 border border-[#1E293B] space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-slate-950 text-xs font-bold">3</span>
              <span className="text-xs font-bold text-slate-100">AI 초안 검수 & 저장</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI가 작성한 제목과 본문을 검수하고 다듬어 초안으로 보관함에 저장합니다. 수동 글쓰기도 지원합니다.
            </p>
          </div>

          <div className="rounded-xl bg-[#070A12] p-4 border border-[#1E293B] space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-slate-950 text-xs font-bold">4</span>
              <span className="text-xs font-bold text-slate-100">카페 게시판 발행</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              준비된 초안을 원하는 카페 게시판으로 즉시 발행하거나 예약 포스팅을 실행합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
