import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getValidInstagramAccessToken } from "@/lib/actions/instagram";
import { sendInstagramDirectMessage } from "@/lib/instagram/client";

export interface PostDmReplyResult {
  error?: string;
  success?: boolean;
}

/**
 * 실제로 인스타그램 DM을 발송하는 핵심 로직. 검토 화면의 "답변승인" 버튼과 텔레그램 승인 버튼
 * 양쪽에서 공유한다(instagram-comment-reply의 postCommentReplyForUser와 동일 구조).
 *
 * 이 대화에서 아직 자동 응답 고지를 보낸 적이 없으면(disclosure_sent_at이 비어있으면), 실제
 * 답장보다 먼저 고지 메시지를 별도로 발송한다 — Meta 비즈니스 메시징 정책이 요구하는 "대화
 * 시작 시 자동 응답임을 고지"를 충족하기 위함이다. 고지 발송이 실패하면 답장도 보내지 않는다
 * (고지 없이 자동 응답만 나가는 상황을 만들지 않기 위함).
 */
export async function postDmReplyForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  messageId: string,
  finalText: string,
): Promise<PostDmReplyResult> {
  const text = finalText.trim();
  if (!text) return { error: "답장 내용이 없습니다." };

  const { data: message } = await supabase
    .from("dm_messages")
    .select("id, conversation_id, status")
    .eq("id", messageId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!message) return { error: "메시지를 찾을 수 없습니다." };
  if (message.status === "posted") return { error: "이미 발송된 답장입니다." };

  const { data: conversation } = await supabase
    .from("dm_conversations")
    .select("id, ig_scoped_id, disclosure_sent_at")
    .eq("id", message.conversation_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!conversation) return { error: "대화를 찾을 수 없습니다." };

  const { data: account } = await supabase
    .from("dm_accounts")
    .select("instagram_user_id, access_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { error: "인스타그램 계정이 연결되어 있지 않습니다." };

  const { data: settings } = await supabase
    .from("dm_settings")
    .select("disclosure_message")
    .eq("user_id", userId)
    .maybeSingle();

  try {
    const accessToken = await getValidInstagramAccessToken(supabase, userId, account);

    if (!conversation.disclosure_sent_at) {
      const disclosureText = settings?.disclosure_message?.trim();
      if (!disclosureText) {
        return { error: "고지 문구가 설정되어 있지 않습니다. 설정 페이지에서 자동 응답 고지 문구를 먼저 등록해주세요." };
      }
      await sendInstagramDirectMessage(accessToken, account.instagram_user_id, conversation.ig_scoped_id, disclosureText);
      await supabase
        .from("dm_conversations")
        .update({ disclosure_sent_at: new Date().toISOString() })
        .eq("id", conversation.id);
    }

    const { messageId: postedMessageId } = await sendInstagramDirectMessage(
      accessToken,
      account.instagram_user_id,
      conversation.ig_scoped_id,
      text,
    );

    await supabase
      .from("dm_messages")
      .update({ status: "posted", posted_message_id: postedMessageId, generated_reply: text, replied_at: new Date().toISOString() })
      .eq("id", messageId);

    return { success: true };
  } catch (err) {
    const message2 = err instanceof Error ? err.message : "DM 발송 중 오류가 발생했습니다.";
    await supabase.from("dm_messages").update({ status: "failed" }).eq("id", messageId);
    if (message2 === "INSTAGRAM_RECONNECT_REQUIRED") {
      return { error: "인스타그램 계정 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message2 };
  }
}
