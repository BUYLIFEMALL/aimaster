import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { dispatchScheduledPostsAction } from "@/lib/actions/posts";
import type { PostStatus } from "@/types/post";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: posts }, { data: account }] = await Promise.all([
    supabase
      .from("insta_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("insta_accounts").select("*").eq("user_id", user.id).maybeSingle(),
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

      {program && (program.description || program.short_desc) && (
        <div className="mb-6 rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
          {program.description ? (
            <div
              className="text-sm leading-relaxed text-neutral-700 [&_p]:mb-2 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: program.description }}
            />
          ) : (
            <p className="text-sm leading-relaxed text-neutral-700">{program.short_desc}</p>
          )}
        </div>
      )}

      {!account && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          인스타그램 계정이 연결되어 있지 않습니다.{" "}
          <Link href="/accounts" className="font-medium underline">
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
                    {post.caption}
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
