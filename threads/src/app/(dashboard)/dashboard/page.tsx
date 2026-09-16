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

  const [{ data: posts }, { data: account }, { data: program }] = await Promise.all([
    supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("threads_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    // 대시보드 상단 설명 박스 — AIMaster 루트의 프로그램 소개(메인 페이지 programs.description/
    // short_desc)를 그대로 가져와 보여준다(naver-cafe-poster에서 먼저 만든 패턴, 2026-09-13).
    // 이 프로젝트의 database.types.ts는 아직 programs 테이블을 포함하지 않아(루트 공용 테이블이라
    // 타입 재생성이 안 돼 있음) 결과 타입을 직접 지정한다.
    supabase.from("programs").select("description, short_desc").eq("slug", "auto-threads-posting").maybeSingle() as unknown as Promise<{
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
          <Link href="/candidates">
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
              API 키 및 계정 설정
            </Link>
            에서 본인의 Meta App ID / App Secret 및 OpenAI API 키를 입력하고, <strong>[Threads 계정 연결]</strong> 버튼을 눌러 쓰레드 계정을 연동합니다.
          </li>
          <li>
            <Link href="/candidates" className="font-semibold text-neutral-900 underline hover:text-black">
              후보 및 주제 관리
            </Link>
            에서 포스팅할 텍스트 아이디어, 주제 키워드, 소구점 분석을 등록하고 AI를 활용해 바이럴 홍보 캡션을 자동 생성합니다.
          </li>
          <li>
            <Link href="/posts" className="font-semibold text-neutral-900 underline hover:text-black">
              게시글 관리 및 예약
            </Link>
            에서 생성된 게시글에 이미지/동영상을 첨부하고 원하는 게시 시각을 지정하여 예약 등록하거나 즉시 게시합니다.
          </li>
          <li>
            <Link href="/dashboard" className="font-semibold text-neutral-900 underline hover:text-black">
              대시보드 모니터링
            </Link>
            에서 게시 상태(임시저장/예약중/게시됨/실패)를 모니터링하고 상단의 <strong>[예약 게시 실행]</strong> 버튼을 눌러 일정을 자동으로 처리합니다.
          </li>
        </ol>
      </div>

      {!account && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Threads 계정이 연결되어 있지 않습니다.{" "}
          <Link href="/settings" className="font-medium underline">
            계정 연결하러 가기
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
