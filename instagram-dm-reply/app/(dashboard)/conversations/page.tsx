import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ConversationReviewItem } from "@/components/conversations/ConversationReviewItem";
import { SettingsSummary } from "@/components/conversations/SettingsSummary";

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
  const { data: conversationList } = await supabase
    .from("dm_conversations")
    .select("id, customer_username")
    .in("id", conversationIds.length > 0 ? conversationIds : ["__none__"]);
  const usernameByConversationId = new Map((conversationList ?? []).map((c) => [c.id, c.customer_username]));

  const groupedByConversation = new Map<string, typeof messages>();
  for (const m of messages ?? []) {
    const list = groupedByConversation.get(m.conversation_id) ?? [];
    list.push(m);
    groupedByConversation.set(m.conversation_id, list);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="sticky top-0 z-10 -mx-4 bg-gray-50 px-4 pb-4 pt-1">
        <div className="mb-4">
          <h1 className="text-2xl font-black text-gray-900">DM 검토/발송</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI가 만든 답장 초안을 확인하고 수정한 뒤 "답변승인"을 눌러야 실제로 인스타그램 DM으로
            나갑니다. 새 DM은 웹훅으로 실시간 수신되므로 별도로 새로고침할 필요는 없어요(단,
            화면은 새로고침해야 최신 목록이 보입니다).
          </p>
        </div>

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

      <div className="pt-6">
        {!messages || messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📩</div>
            <p>검토 대기 중인 DM이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(groupedByConversation.entries()).map(([conversationId, convMessages]) => (
              <div key={conversationId}>
                <h2 className="text-sm font-bold text-gray-700 mb-3">
                  👤 {usernameByConversationId.get(conversationId) || "익명 고객"}
                </h2>
                <div className="space-y-3">
                  {(convMessages ?? []).map((m) => (
                    <ConversationReviewItem
                      key={m.id}
                      message={{
                        id: m.id,
                        sender_username: usernameByConversationId.get(conversationId) ?? null,
                        message_text: m.message_text,
                        generated_reply: m.generated_reply,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
