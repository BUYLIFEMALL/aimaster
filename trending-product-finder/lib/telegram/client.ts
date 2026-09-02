import "server-only";

// 텔레그램 연동은 "공용 봇"이 아니라 사용자 각자가 BotFather로 직접 만든 개인 봇을 쓴다
// (booking-reminder/real_estate_sales와 동일한 패턴 재사용). getUpdates로 "방금 사용자가
// 봇에게 보낸 메시지"에서 chat_id를 읽어온다 — 공용 웹훅을 미리 등록해둘 필요가 없다.

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
  // getUpdates(폴링)와 webhook은 동시에 쓸 수 없다(409 Conflict). 폴링 전에 웹훅을 먼저
  // 해제한다 — 웹훅이 없었어도 안전하게 무시된다.
  await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/deleteWebhook`, { cache: "no-store" }).catch(() => {});

  const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getUpdates?limit=10`, { cache: "no-store" });
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

export async function sendTelegramMessage(params: { botToken: string; chatId: string; text: string }): Promise<void> {
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
