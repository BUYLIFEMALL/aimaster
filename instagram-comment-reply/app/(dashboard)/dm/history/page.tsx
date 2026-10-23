import { requireProgramAccess } from "@/lib/dmApp/access";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeKo } from "@/lib/formatDate";
import { StudioHeader, StatCard, Avatar } from "@/components/dm/ui/StudioHeader";
import { HistoryTabs } from "@/components/HistoryTabs";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 50;

export default async function HistoryPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: posted }, { count: postedTotal }, { count: postedThisWeek }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("dm_messages")
        .select("id, conversation_id, message_text, generated_reply, replied_at")
        .eq("user_id", user.id)
        .eq("status", "posted")
        .order("replied_at", { ascending: false })
        .limit(HISTORY_LIMIT),
      supabase
        .from("dm_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted"),
      supabase
        .from("dm_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted")
        .gte("replied_at", sevenDaysAgo),
      supabase
        .from("dm_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending_review"),
    ]);

  const conversationIds = Array.from(new Set((posted ?? []).map((m) => m.conversation_id)));
  const { data: conversationList } = await supabase
    .from("dm_conversations")
    .select("id, customer_username")
    .in("id", conversationIds.length > 0 ? conversationIds : ["__none__"]);
  const usernameByConversationId = new Map((conversationList ?? []).map((c) => [c.id, c.customer_username]));

  return (
    <div className="mx-auto max-w-4xl">
      <StudioHeader icon="📊" title="발송 이력" description="지금까지 실제로 인스타그램 DM으로 발송된 답장입니다." />
      <HistoryTabs active="dm" />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="총 발송한 답장" value={postedTotal ?? 0} />
        <StatCard label="최근 7일 발송" value={postedThisWeek ?? 0} />
        <StatCard label="검토 대기 중" value={pendingCount ?? 0} accent={(pendingCount ?? 0) > 0} />
      </div>

      {!posted || posted.length === 0 ? (
        <div className="ig-card py-16 text-center text-ig-muted">
          <div className="mb-3 text-5xl">📭</div>
          <p className="text-sm">아직 발송된 답장이 없습니다.</p>
        </div>
      ) : (
        <div className="ig-card divide-y divide-ig-border py-2">
          {posted.map((m) => {
            const username = usernameByConversationId.get(m.conversation_id);
            return (
              <div key={m.id} className="space-y-2 py-4">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-ig-text">{username ? `@${username}` : "익명 고객"}</span>
                  {m.replied_at && <span className="text-ig-muted">{formatDateTimeKo(m.replied_at)}</span>}
                </div>
                <div className="flex items-end gap-2">
                  <Avatar name={username ?? null} size={26} />
                  <p className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-bl-md bg-ig-raised px-4 py-2.5 text-sm text-ig-text">
                    {m.message_text}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-ig-primary px-4 py-2.5 text-sm text-white">
                    {m.generated_reply}
                  </p>
                  <span className="mt-1 text-[11px] font-semibold text-ig-success">✓ 발송됨</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {posted && posted.length === HISTORY_LIMIT && (
        <p className="pt-3 text-center text-xs text-ig-muted">최근 {HISTORY_LIMIT}건만 표시됩니다.</p>
      )}
    </div>
  );
}
