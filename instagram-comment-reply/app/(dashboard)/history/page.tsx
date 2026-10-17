import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeKo } from "@/lib/formatDate";
import { StudioHeader, StatCard, Avatar } from "@/components/ui/StudioHeader";
import { IgLogo } from "@/components/ui/IgLogo";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 50;

export default async function HistoryPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: posted }, { count: postedTotal }, { count: postedThisWeek }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("ig_comments")
        .select("id, media_id, author_username, comment_text, generated_reply, replied_at")
        .eq("user_id", user.id)
        .eq("status", "posted")
        .order("replied_at", { ascending: false })
        .limit(HISTORY_LIMIT),
      supabase
        .from("ig_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted"),
      supabase
        .from("ig_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted")
        .gte("replied_at", sevenDaysAgo),
      supabase
        .from("ig_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending_review"),
    ]);

  const mediaIds = Array.from(new Set((posted ?? []).map((c) => c.media_id)));
  const { data: mediaList } = await supabase
    .from("ig_media")
    .select("id, caption")
    .in("id", mediaIds.length > 0 ? mediaIds : ["__none__"]);
  const captionByMediaId = new Map((mediaList ?? []).map((m) => [m.id, m.caption]));

  return (
    <div className="mx-auto max-w-4xl">
      <StudioHeader icon="📊" title="답글 이력" description="지금까지 실제로 인스타그램에 게시된 답글입니다." />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="총 게시한 답글" value={postedTotal ?? 0} />
        <StatCard label="최근 7일 게시" value={postedThisWeek ?? 0} />
        <StatCard label="검토 대기 중" value={pendingCount ?? 0} accent={(pendingCount ?? 0) > 0} />
      </div>

      {!posted || posted.length === 0 ? (
        <div className="ig-card py-16 text-center text-ig-muted">
          <div className="mb-3 text-5xl">📭</div>
          <p className="text-sm">아직 게시된 답글이 없습니다.</p>
        </div>
      ) : (
        <div className="ig-card divide-y divide-ig-border py-2">
          {posted.map((c) => (
            <div key={c.id} className="flex gap-3 py-4">
              <Avatar name={c.author_username} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-xs">
                  <span className="font-semibold text-ig-text">{c.author_username ? `@${c.author_username}` : "익명"}</span>
                  <span className="truncate text-ig-muted">· 🖼️ {captionByMediaId.get(c.media_id) || "(삭제된 게시물)"}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ig-text">{c.comment_text}</p>
                <div className="mt-3 flex gap-2.5">
                  <span className="mt-0.5"><IgLogo size={22} /></span>
                  <div className="min-w-0 flex-1 rounded-lg bg-ig-raised p-3">
                    <p className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-ig-success">✓ 게시됨</span>
                      {c.replied_at && <span className="text-ig-muted">{formatDateTimeKo(c.replied_at)}</span>}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-ig-text">{c.generated_reply}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {posted && posted.length === HISTORY_LIMIT && (
        <p className="pt-3 text-center text-xs text-ig-muted">최근 {HISTORY_LIMIT}건만 표시됩니다.</p>
      )}
    </div>
  );
}
