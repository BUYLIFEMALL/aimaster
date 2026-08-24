import "server-only";

// 텔레그램 연동은 "공용 봇"이 아니라 사용자 각자가 BotFather로 직접 만든 개인 봇을 쓴다
// (OpenAI/Perplexity 키를 사용자 개인 키로 쓰는 것과 동일한 철학). 그래서 웹훅을 우리가
// 미리 등록해둘 수 없고, 기존 부동산 자동화 Make 시나리오가 쓰던 방식과 동일하게
// getUpdates로 "방금 사용자가 봇에게 보낸 메시지"에서 chat_id를 읽어온다.

const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface TelegramChatInfo {
  chatId: string;
  botUsername?: string;
}

/**
 * 사용자가 자신의 봇에게 메시지(예: /start)를 보낸 뒤 호출하면, 가장 최근 메시지에서
 * chat_id를 찾아 반환한다. 메시지를 아직 안 보냈으면 null.
 */
export async function findChatIdFromUpdates(botToken: string): Promise<TelegramChatInfo | null> {
  // getUpdates(폴링)와 webhook은 동시에 쓸 수 없다 (409 Conflict). 이 봇이 예전에
  // 다른 서비스(예: Make.com)에서 웹훅으로 등록된 적이 있으면 충돌하므로, 폴링 방식을
  // 쓰기 전에 웹훅을 먼저 해제한다. 웹훅이 없었어도 안전하게 무시된다.
  await deleteTelegramWebhook(botToken);

  const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getUpdates?limit=10`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) throw new Error("봇 토큰이 올바르지 않습니다.");
    if (res.status === 409) {
      throw new Error(
        "이 봇에 웹훅이 이미 등록되어 있어서 getUpdates를 쓸 수 없어요. BotFather나 다른 곳에서 이 봇의 웹훅을 설정한 적이 있다면 해제해야 해요.",
      );
    }
    const description = data?.description ? ` — ${data.description}` : "";
    throw new Error(`텔레그램 API 요청 실패 (${res.status})${description}`);
  }

  const results: { message?: { chat?: { id: number } } }[] = data?.result ?? [];
  const last = [...results].reverse().find((r) => r.message?.chat?.id);
  if (!last?.message?.chat?.id) return null;

  let botUsername: string | undefined;
  try {
    const meRes = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getMe`, { cache: "no-store" });
    const me = await meRes.json();
    botUsername = me?.result?.username;
  } catch {
    // 표시용 정보라 실패해도 무시
  }

  return { chatId: String(last.message.chat.id), botUsername };
}

export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string;
  text: string;
}): Promise<void> {
  const { botToken, chatId, text } = params;
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`텔레그램 메시지 발송 실패 (${res.status}): ${body}`);
  }
}

export interface TelegramInlineButton {
  text: string;
  callbackData: string;
}

/** 원본 댓글 + AI 답글 초안과 함께 "게시/보류/게시제외" 인라인 버튼을 보낸다. */
export async function sendTelegramMessageWithButtons(params: {
  botToken: string;
  chatId: string;
  text: string;
  buttons: TelegramInlineButton[];
}): Promise<{ messageId: number }> {
  const { botToken, chatId, text, buttons } = params;
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: [buttons.map((b) => ({ text: b.text, callback_data: b.callbackData }))] },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.result?.message_id) {
    throw new Error(`텔레그램 메시지 발송 실패 (${res.status}): ${JSON.stringify(data)}`);
  }
  return { messageId: data.result.message_id };
}

/** 버튼을 눌러 처리된 뒤, 그 메시지를 결과 텍스트로 갱신하고 버튼은 제거한다(중복 클릭 방지). */
export async function editTelegramMessageStatus(params: {
  botToken: string;
  chatId: string;
  messageId: number;
  text: string;
}): Promise<void> {
  await fetch(`${TELEGRAM_API_BASE}/bot${params.botToken}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: params.chatId,
      message_id: params.messageId,
      text: params.text,
      reply_markup: { inline_keyboard: [] },
    }),
  }).catch(() => {});
}

/** 버튼을 누른 순간 텔레그램 UI의 "로딩 스피너"를 멈추기 위해 반드시 응답해야 한다. */
export async function answerTelegramCallbackQuery(params: {
  botToken: string;
  callbackQueryId: string;
  text?: string;
}): Promise<void> {
  await fetch(`${TELEGRAM_API_BASE}/bot${params.botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: params.callbackQueryId, text: params.text }),
  }).catch(() => {});
}

export async function setTelegramWebhook(params: {
  botToken: string;
  url: string;
  secretToken: string;
}): Promise<void> {
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${params.botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: params.url, secret_token: params.secretToken, allowed_updates: ["callback_query"] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`텔레그램 웹훅 등록 실패 (${res.status}): ${body}`);
  }
}

export async function deleteTelegramWebhook(botToken: string): Promise<void> {
  await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/deleteWebhook`, { cache: "no-store" }).catch(() => {});
}
