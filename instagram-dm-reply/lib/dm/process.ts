import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getUserApiKey } from "@/lib/apiKeys";
import { getValidInstagramAccessToken } from "@/lib/actions/instagram";
import { getInstagramParticipantUsername } from "@/lib/instagram/client";
import { generateDmReply } from "@/lib/ai/reply";
import { getTonePresetInstruction } from "@/lib/tonePresets";
import { getReplyModelProvider } from "@/lib/ai/models";
import { sendTelegramMessage, sendTelegramMessageWithButtons } from "@/lib/telegram/client";
import { postDmReplyForUser } from "@/lib/dm/post";

const THIS_PROGRAM_SLUG = "instagram-dm-reply";

export interface IncomingDmEvent {
  senderId: string;
  igMessageId: string;
  text: string;
  timestampMs: number;
}

export interface ProcessResult {
  processed: boolean;
  reason?: string;
}

/**
 * 웹훅으로 들어온 수신 DM 1건을 처리한다(대화 upsert → 저장 → AI 초안 생성 → 자동발송/승인요청
 * 분기). threads-comment-reply/instagram-comment-reply의 lib/comments/sync.ts와 같은 역할이지만,
 * 저쪽은 폴링으로 여러 건을 한 번에 훑는 구조고, 이쪽은 웹훅이 이벤트 1건씩 실시간으로 주는
 * 구조라 훨씬 단순하다(자체 폴링/커서 로직이 필요 없음).
 */
export async function processIncomingDmMessage(
  supabase: SupabaseClient<Database>,
  userId: string,
  event: IncomingDmEvent,
): Promise<ProcessResult> {
  const { data: account } = await supabase
    .from("dm_accounts")
    .select("instagram_user_id, access_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { processed: false, reason: "계정이 연결되어 있지 않습니다." };

  const { data: settings } = await supabase
    .from("dm_settings")
    .select("bot_enabled, bot_started_at, auto_approve, default_link, ai_instructions, tone_preset, reply_model")
    .eq("user_id", userId)
    .maybeSingle();
  if (!settings?.bot_enabled) return { processed: false, reason: "봇이 꺼져 있습니다." };

  if (settings.bot_started_at && event.timestampMs < new Date(settings.bot_started_at).getTime()) {
    return { processed: false, reason: "봇을 켜기 이전 메시지입니다." };
  }

  // 이미 저장된 메시지면(재전송/중복 웹훅) 조용히 무시한다.
  const { data: existing } = await supabase
    .from("dm_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("ig_message_id", event.igMessageId)
    .maybeSingle();
  if (existing) return { processed: false, reason: "이미 처리된 메시지입니다." };

  let { data: conversation } = await supabase
    .from("dm_conversations")
    .select("id, customer_username")
    .eq("user_id", userId)
    .eq("ig_scoped_id", event.senderId)
    .maybeSingle();

  if (!conversation) {
    let accessTokenForLookup: string | null = null;
    try {
      accessTokenForLookup = await getValidInstagramAccessToken(supabase, userId, account);
    } catch {
      // 상대방 이름 조회는 best-effort라 토큰 문제는 여기서 그냥 넘어가고, 발송 시점에 다시 다룬다.
    }
    const username = accessTokenForLookup
      ? await getInstagramParticipantUsername(accessTokenForLookup, event.senderId)
      : null;

    const { data: inserted } = await supabase
      .from("dm_conversations")
      .insert({ user_id: userId, ig_scoped_id: event.senderId, customer_username: username })
      .select("id, customer_username")
      .single();
    conversation = inserted ?? null;
  }
  if (!conversation) return { processed: false, reason: "대화 생성에 실패했습니다." };

  await supabase
    .from("dm_conversations")
    .update({ last_inbound_at: new Date().toISOString() })
    .eq("id", conversation.id);

  const { data: insertedMessage, error: insertError } = await supabase
    .from("dm_messages")
    .insert({
      user_id: userId,
      conversation_id: conversation.id,
      ig_message_id: event.igMessageId,
      direction: "in",
      message_text: event.text,
      status: "pending_review",
    })
    .select("id")
    .single();
  if (insertError || !insertedMessage) return { processed: false, reason: insertError?.message ?? "메시지 저장 실패" };

  const aiProvider = getReplyModelProvider(settings.reply_model);
  const aiApiKey = await getUserApiKey(supabase, userId, aiProvider);

  let generatedReply: string | null = null;
  if (aiApiKey) {
    const toneInstruction = getTonePresetInstruction(settings.tone_preset ?? null);
    const combinedInstructions = [toneInstruction, settings.ai_instructions].filter(Boolean).join(" ") || null;
    try {
      generatedReply = await generateDmReply({
        senderUsername: conversation.customer_username,
        messageText: event.text,
        link: settings.default_link ?? null,
        customInstructions: combinedInstructions,
        model: settings.reply_model,
        apiKey: aiApiKey,
      });
      await supabase.from("dm_messages").update({ generated_reply: generatedReply }).eq("id", insertedMessage.id);
    } catch (err) {
      console.error(`DM 답장 초안 생성 실패 (message ${insertedMessage.id}):`, err);
    }
  }

  const { data: telegramLink } = await supabase
    .from("user_telegram_links")
    .select("bot_token, chat_id")
    .eq("user_id", userId)
    .eq("program_slug", THIS_PROGRAM_SLUG)
    .maybeSingle();

  const senderLabel = conversation.customer_username ?? "고객";

  if (settings.auto_approve && generatedReply) {
    const postResult = await postDmReplyForUser(supabase, userId, insertedMessage.id, generatedReply);
    if (telegramLink) {
      const text = postResult.success
        ? [`🤖 자동 발송 완료`, `👤 ${senderLabel}: ${event.text}`, "", `✅ 발송된 답장:\n${generatedReply}`].join("\n")
        : `⚠️ 자동 발송 실패 (${senderLabel}): ${postResult.error ?? "알 수 없는 오류"}`;
      await sendTelegramMessage({ botToken: telegramLink.bot_token, chatId: telegramLink.chat_id, text }).catch((sendErr) =>
        console.error(`텔레그램 자동 발송 알림 실패 (message ${insertedMessage.id}):`, sendErr),
      );
    }
  } else if (telegramLink && generatedReply) {
    try {
      const { messageId: tgMessageId } = await sendTelegramMessageWithButtons({
        botToken: telegramLink.bot_token,
        chatId: telegramLink.chat_id,
        text: [`👤 ${senderLabel}: ${event.text}`, "", `✍️ AI 답장 초안:\n${generatedReply}`].join("\n"),
        buttons: [
          { text: "✅ 답변승인", callbackData: `post:${insertedMessage.id}` },
          { text: "⏸ 답변보류", callbackData: `hold:${insertedMessage.id}` },
          { text: "❌ 답변제외", callbackData: `skip:${insertedMessage.id}` },
        ],
      });
      await supabase
        .from("dm_messages")
        .update({ telegram_chat_id: telegramLink.chat_id, telegram_message_id: tgMessageId })
        .eq("id", insertedMessage.id);
    } catch (sendErr) {
      console.error(`텔레그램 승인 메시지 발송 실패 (message ${insertedMessage.id}):`, sendErr);
    }
  }

  return { processed: true };
}
