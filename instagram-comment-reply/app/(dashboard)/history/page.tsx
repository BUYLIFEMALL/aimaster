import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeKo } from "@/lib/formatDate";

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
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">📊 답글 이력</h1>
        <p className="text-sm text-gray-500 mt-1">지금까지 실제로 게시된 답글 이력입니다.</p>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-gray-900">{postedTotal ?? 0}</p>
          <p className="mt-1 text-xs text-gray-400">총 게시된 답글</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-gray-900">{postedThisWeek ?? 0}</p>
          <p className="mt-1 text-xs text-gray-400">최근 7일 게시</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-gray-900">{pendingCount ?? 0}</p>
          <p className="mt-1 text-xs text-gray-400">검토 대기 중</p>
        </div>
      </div>

      {!posted || posted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p>아직 게시된 답글이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posted.map((c) => (
            <div key={c.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400">📸 {captionByMediaId.get(c.media_id) || "(삭제된 게시물)"}</p>
                {c.replied_at && <p className="text-xs text-gray-400">{formatDateTimeKo(c.replied_at)}</p>}
              </div>
              <p className="text-xs text-gray-400">{c.author_username ?? "익명"}의 댓글</p>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{c.comment_text}</p>
              <p className="mt-2 text-xs font-semibold text-gray-400">✅ 게시된 답글</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{c.generated_reply}</p>
            </div>
          ))}
          {posted.length === HISTORY_LIMIT && (
            <p className="pt-2 text-center text-xs text-gray-400">최근 {HISTORY_LIMIT}건만 표시됩니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
