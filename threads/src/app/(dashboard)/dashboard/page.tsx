import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { dispatchScheduledPostsAction } from "@/lib/actions/posts";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import type { PostStatus } from "@/types/post";

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
