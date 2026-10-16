import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeKo } from "@/lib/formatDate";
import { StudioHeader, StatCard, Avatar } from "@/components/ui/StudioHeader";
import { LoadErrorNotice } from "@/components/ui/LoadErrorNotice";

export const dynamic = "force-dynamic";

// 2026-10-17 v1.10: 최근 50건 고정 → 검색(댓글·답글·작성자)·페이지 나눔(#7), 조회 실패를 "없음"과 구분(#13).
// 30일 지난 기록은 내용이 비워지므로(/api/cron/cleanup-comments) 목록에서 제외한다(개수에는 포함).
const PAGE_SIZE = 20;

/** PostgREST or() 필터 문법을 깨는 문자(쉼표·괄호·%·\)를 빼고 50자로 자른다. */
function cleanQuery(raw: string | undefined): string {
  return (raw ?? "").replace(/[,()%\\*]/g, " ").trim().slice(0, 50);
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const params = await searchParams;
  const q = cleanQuery(params.q);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let listQuery = supabase
    .from("ytreply_comments")
    .select("id, video_id, author_display_name, comment_text, generated_reply, replied_at", { count: "exact" })
    .eq("user_id", user.id)
    .eq("status", "posted")
    .neq("comment_text", "");
  if (q) {
    const like = `%${q}%`;
    listQuery = listQuery.or(
      `comment_text.ilike.${like},generated_reply.ilike.${like},author_display_name.ilike.${like}`,
    );
  }

  const [listResult, totalResult, weekResult, pendingResult] = await Promise.all([
    listQuery.order("replied_at", { ascending: false }).range(from, from + PAGE_SIZE - 1),
    supabase
      .from("ytreply_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "posted"),
    supabase
      .from("ytreply_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "posted")
      .gte("replied_at", sevenDaysAgo),
    supabase
      .from("ytreply_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending_review"),
  ]);

  const loadFailed = Boolean(listResult.error || totalResult.error || weekResult.error || pendingResult.error);
  const posted = listResult.data ?? [];
  const matched = listResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(matched / PAGE_SIZE));

  const videoIds = Array.from(new Set(posted.map((c) => c.video_id)));
  // No UUID sentinel: an empty feed needs no video lookup. Scope title reads to this member too.
  const { data: videos } = videoIds.length > 0
    ? await supabase.from("ytreply_videos").select("id, title").eq("user_id", user.id).in("id", videoIds)
    : { data: [] };
  const titleByVideoId = new Map((videos ?? []).map((v) => [v.id, v.title]));

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/history?${s}` : "/history";
  };

  return (
    <div className="mx-auto max-w-4xl">
      <StudioHeader icon="📊" title="답글 이력" description="지금까지 실제로 유튜브에 게시된 답글입니다." />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="총 게시한 답글" value={totalResult.count ?? 0} />
        <StatCard label="최근 7일 게시" value={weekResult.count ?? 0} />
        <StatCard label="검토 대기 중" value={pendingResult.count ?? 0} accent={(pendingResult.count ?? 0) > 0} />
      </div>

      <form action="/history" method="get" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="댓글·답글 내용이나 작성자 이름으로 검색"
          className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-yt-border bg-yt-raised px-3 text-sm text-yt-text placeholder:text-yt-muted"
        />
        <button type="submit" className="min-h-[44px] shrink-0 rounded-lg bg-yt-red px-4 text-sm font-semibold text-white">
          검색
        </button>
        {q && (
          <Link href="/history" className="flex min-h-[44px] shrink-0 items-center rounded-lg border border-yt-border px-3 text-sm text-yt-muted">
            지우기
          </Link>
        )}
      </form>
      <p className="mb-3 text-xs text-yt-muted">
        게시 기록의 댓글·답글 내용은 30일이 지나면 자동으로 지워져 목록에서 빠집니다(위 개수에는 포함).
      </p>

      {loadFailed ? (
        <LoadErrorNotice what="답글 이력" />
      ) : posted.length === 0 ? (
        <div className="yt-card py-16 text-center text-yt-muted">
          <div className="mb-3 text-5xl">📭</div>
          <p className="text-sm">{q ? `"${q}"에 맞는 게시 답글이 없습니다.` : "아직 게시된 답글이 없습니다."}</p>
        </div>
      ) : (
        <div className="yt-card divide-y divide-yt-border py-2">
          {posted.map((c) => (
            <div key={c.id} className="flex gap-3 py-4">
              <Avatar name={c.author_display_name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-xs">
                  <span className="font-semibold text-yt-text">{c.author_display_name ?? "익명"}</span>
                  <span className="truncate text-yt-muted">· 🎬 {titleByVideoId.get(c.video_id) ?? "(삭제된 영상)"}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-yt-text">{c.comment_text}</p>
                <div className="mt-3 flex gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yt-red text-[10px] text-white">▶</span>
                  <div className="min-w-0 flex-1 rounded-lg bg-yt-raised p-3">
                    <p className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-yt-success">✓ 게시됨</span>
                      {c.replied_at && <span className="text-yt-muted">{formatDateTimeKo(c.replied_at)}</span>}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm text-yt-text">{c.generated_reply}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadFailed && matched > PAGE_SIZE && (
        <nav className="flex items-center justify-center gap-3 pt-4 text-sm" aria-label="페이지">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="flex min-h-[44px] items-center rounded-lg border border-yt-border px-4 text-yt-text">
              ← 이전
            </Link>
          ) : (
            <span className="flex min-h-[44px] items-center px-4 text-yt-muted opacity-50">← 이전</span>
          )}
          <span className="text-yt-muted">
            {page} / {totalPages} 페이지 · {matched}건
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="flex min-h-[44px] items-center rounded-lg border border-yt-border px-4 text-yt-text">
              다음 →
            </Link>
          ) : (
            <span className="flex min-h-[44px] items-center px-4 text-yt-muted opacity-50">다음 →</span>
          )}
        </nav>
      )}
    </div>
  );
}
