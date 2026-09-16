import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import type { PostStatus } from "@/types/post";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: posts }, { data: account }, { count: targetCount }, { data: program }] = await Promise.all([
    supabase
      .from("ncafe_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("ncafe_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("ncafe_targets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    // 대시보드 상단 설명 박스 — AIMaster 루트의 프로그램 소개(메인 페이지 programs.description/
    // short_desc)를 그대로 가져와 보여준다(2026-09-13 요청) — 이 프로그램만의 별도 텍스트를
    // 새로 쓰지 않고, 판매 페이지 내용과 항상 같은 소스를 쓰게 해서 나중에 어긋나지 않게 한다.
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">대시보드</h1>
        <Link href="/drafts">
          <Button>AI 자동 글쓰기(초안)</Button>
        </Link>
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
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          네이버 계정이 연결되어 있지 않습니다.{" "}
          <Link href="/settings" className="font-medium underline">
            계정 연결하러 가기
          </Link>
        </div>
      )}
      {(targetCount ?? 0) === 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          등록된 카페 게시판이 없습니다.{" "}
          <Link href="/settings" className="font-medium underline">
            카페 등록하러 가기
          </Link>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(counts) as PostStatus[]).map((status) => (
          <div key={status} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-semibold text-neutral-900">{counts[status]}</div>
            <div className="mt-1">
              <StatusBadge status={status} />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">📖 사용방법</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
          <li>
            <strong>API키등록·플랫폼연동</strong>에서 네이버 계정을 연동하고, 게시할 카페의
            게시판(club_id/menu_id)을 등록합니다. AI 글쓰기에 쓸 OpenAI/Perplexity API 키도
            여기서 본인 것으로 등록합니다.
          </li>
          <li>
            <strong>게시글 주제 수집</strong> 화면 상단 "🗂 카테고리 관리"에서 원하는 카테고리를
            미리 만들어두면, 이후 글감을 카테고리별로 정리해서 관리할 수 있습니다.
          </li>
          <li>
            HTTP(URL 지정)/RSS(NewsBlur 구독 피드)/Perplexity(트렌드 검색) 중 하나를 골라
            카테고리를 지정하고 "글감 수집"을 누르면 AI가 게시글 후보를 만들어줍니다.
          </li>
          <li>
            같은 화면에서 "🔔 예약 자동화로 등록"을 켜면, 정해둔 주기마다 자동으로 새 글감을
            만듭니다. "자동 포스팅"을 켜두면 검토 없이 바로 카페에 게시되고, 꺼두면 초안으로만
            저장됩니다.
          </li>
          <li>
            "수집된 게시글 후보"는 기존에 모아둔 것과 새로 수집되는 것 모두 기본적으로 예약포스팅
            대상에 포함됩니다 — "🗂️ 게시글 후보에서 예약발행" 소스를 등록해두면 그중 카테고리가
            맞는 후보를 먼저 모인 순서대로 하나씩 골라 자동으로 카페에 올려줍니다. 특정 글만
            빼고 싶으면 후보 목록에서 "예약포스팅"을 OFF로 끄면 됩니다.
          </li>
          <li>
            <strong>AI 자동 글쓰기(초안)</strong>에서 저장된 초안의 제목·본문을 확인·수정한 뒤
            "검수 완료·배포"를 눌러 카페에 게시합니다. 수집 없이 바로 새 글을 만들고 싶다면{" "}
            <strong>AI 자동 글쓰기(수동)</strong>에서 주제를 입력해 즉시 생성할 수 있습니다.
          </li>
          <li>
            <strong>게시글 관리</strong>에서 지금까지 게시된 글 전체 이력을 확인할 수 있습니다.
          </li>
        </ol>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <h2 className="text-sm font-semibold text-neutral-900">최근 게시글</h2>
        </div>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">작성된 게시글이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recent.map((post) => (
              <li key={post.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <Link href={`/posts/${post.id}`} className="block truncate text-sm text-neutral-900 hover:underline">
                    {post.title}
                  </Link>
                  <p className="mt-1 text-xs text-neutral-500">
                    {new Date(post.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <StatusBadge status={post.status as PostStatus} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
