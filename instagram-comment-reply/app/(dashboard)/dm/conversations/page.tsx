import { requireProgramAccess } from "@/lib/dmApp/access";
import { createClient } from "@/lib/supabase/server";
import { ConversationReviewItem } from "@/components/dm/conversations/ConversationReviewItem";
import { SettingsSummary } from "@/components/dm/conversations/SettingsSummary";
import { StudioHeader, Avatar } from "@/components/dm/ui/StudioHeader";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: messages }, { data: settings }] = await Promise.all([
    supabase
      .from("dm_messages")
      .select("id, conversation_id, message_text, generated_reply, created_at")
      .eq("user_id", user.id)
      .eq("direction", "in")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false }),
    supabase
      .from("dm_settings")
      .select("default_link, tone_preset, reply_model, auto_approve, bot_enabled, bot_started_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const conversationIds = Array.from(new Set((messages ?? []).map((m) => m.conversation_id)));
  const [{ data: conversationList }, { data: rawHistory }] = await Promise.all([
    supabase
      .from("dm_conversations")
      .select("id, customer_username, last_inbound_at")
      .in("id", conversationIds.length > 0 ? conversationIds : ["__none__"]),
    conversationIds.length > 0
      ? supabase
          .from("dm_messages")
          .select("id, conversation_id, direction, message_text, created_at")
          .eq("user_id", user.id)
          .in("conversation_id", conversationIds)
          .neq("status", "pending_review")
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
  ]);
  const conversationMap = new Map((conversationList ?? []).map((c) => [c.id, c]));

  // 대화별 직전 대화 맥락 (최근 3건, 시간 오름차순 정렬)
  const historyByConversation = new Map<string, Array<{ id: string; direction: "in" | "out"; message_text: string; created_at: string }>>();
  for (const h of rawHistory ?? []) {
    const list = historyByConversation.get(h.conversation_id) ?? [];
    if (list.length < 3) {
      list.unshift(h as { id: string; direction: "in" | "out"; message_text: string; created_at: string });
      historyByConversation.set(h.conversation_id, list);
    }
  }

  const groupedByConversation = new Map<string, typeof messages>();
  for (const m of messages ?? []) {
    const list = groupedByConversation.get(m.conversation_id) ?? [];
    list.push(m);
    groupedByConversation.set(m.conversation_id, list);
  }


  function getWindowBadge(lastInboundAt?: string | null) {
    if (!lastInboundAt) return null;
    const inboundTime = new Date(lastInboundAt).getTime();
    const elapsedHours = (Date.now() - inboundTime) / (1000 * 60 * 60);
    const remainingHours = Math.max(0, 24 - elapsedHours);

    if (remainingHours <= 0) {
      return (
        <span className="rounded-full bg-ig-danger/10 px-2.5 py-0.5 text-xs font-bold text-ig-danger">
          ⚠️ 24시간 윈도우 만료 (메시지 응답 제한)
        </span>
      );
    }
    const hours = Math.floor(remainingHours);
    const mins = Math.floor((remainingHours % 1) * 60);
    const isUrgent = remainingHours < 4;
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isUrgent ? "bg-ig-warn/10 text-ig-warn" : "bg-ig-success/10 text-ig-success"}`}>
        ⏳ 24시간 윈도우 {hours}시간 {mins}분 남음
      </span>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* 스크롤해도 화면 상단에 계속 보이도록 목록과 분리한 고정 머리말 */}
      <div className="sticky top-[64px] z-10 -mx-4 bg-ig-bg px-4 pb-4 pt-1 md:top-0 md:-mx-8 md:px-8">
        <StudioHeader
          icon="💬"
          title="DM 검토/발송"
          description="AI가 만든 답장 초안을 확인하고 수정한 뒤 「답변승인 · 발송」을 눌러야 실제 인스타그램 DM으로 나갑니다. 새 DM은 웹훅으로 실시간 들어오며, 고객의 마지막 메시지로부터 24시간 안에 답해야 해요."
        />

        <SettingsSummary
          data={{
            defaultLink: settings?.default_link ?? null,
            tonePreset: settings?.tone_preset ?? null,
            replyModel: settings?.reply_model ?? null,
            autoApprove: settings?.auto_approve ?? false,
            botEnabled: settings?.bot_enabled ?? false,
            botStartedAt: settings?.bot_started_at ?? null,
          }}
        />
      </div>

      <div className="pt-4">
        {!messages || messages.length === 0 ? (
          <div className="ig-card py-16 text-center">
            <div className="mb-3 text-5xl">📩</div>
            <p className="text-sm text-ig-muted">검토 대기 중인 DM이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedByConversation.entries()).map(([conversationId, convMessages]) => {
              const conv = conversationMap.get(conversationId);
              const username = conv?.customer_username;
              return (
                // v1.27: 대시보드 「검토를 기다리는 DM」에서 #conv-<id>로 바로 이동(고정 머리말에 가리지 않게 scroll-mt)
                <section key={conversationId} id={`conv-${conversationId}`} className="ig-card scroll-mt-80 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ig-border pb-3">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-ig-text">
                      <Avatar name={username ?? null} size={30} />
                      {username ? `@${username}` : "익명 고객"}
                    </h2>
                    {getWindowBadge(conv?.last_inbound_at)}
                  </div>
                  <div className="divide-y divide-ig-border">
                    {(convMessages ?? []).map((m) => (
                      <ConversationReviewItem
                        key={m.id}
                        message={{
                          id: m.id,
                          sender_username: username ?? null,
                          message_text: m.message_text,
                          generated_reply: m.generated_reply,
                          history: historyByConversation.get(conversationId),
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
