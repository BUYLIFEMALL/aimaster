import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserApiKey } from "@/lib/apiKeys";
import { computeInstagramVerifyToken, verifyInstagramWebhookSignature } from "@/lib/instagram/webhookSecret";
import { processIncomingDmMessage } from "@/lib/dm/process";

export const dynamic = "force-dynamic";

interface MetaMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean };
}

interface MetaWebhookBody {
  object?: string;
  entry?: { id?: string; time?: number; messaging?: MetaMessagingEvent[] }[];
}

/**
 * Meta의 웹훅 검증 핸드셰이크. App Dashboard에 이 URL(사용자별로 userId가 다름)과 아래에서
 * 계산하는 verify_token을 그대로 등록해두면, 구독을 켤 때 Meta가 이 GET을 보내 확인한다.
 */
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = request.nextUrl.searchParams.get("hub.verify_token");

  let expected: string;
  try {
    expected = computeInstagramVerifyToken(params.userId);
  } catch {
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  if (mode === "subscribe" && verifyToken === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

/**
 * 실제 DM 수신 이벤트. 사용자마다 자기 Meta 앱을 쓰므로(본인 앱 패턴), 서명 검증에 쓰는
 * app secret도 그 사용자가 등록한 meta_app_secret이어야 한다 — 공용 시크릿이 아니다.
 */
export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const userId = params.userId;
  const admin = createAdminClient();

  const rawBody = await request.text();

  const appSecret = await getUserApiKey(admin, userId, "meta_app_secret");
  if (!appSecret) {
    // 앱 시크릿이 등록되어 있지 않으면 서명 검증 자체가 불가능하다 — 조용히 무시(200)해서
    // Meta의 재시도 폭주를 막는다.
    return NextResponse.json({ ok: true });
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyInstagramWebhookSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as MetaWebhookBody;
  if (body.object !== "instagram") return NextResponse.json({ ok: true });

  for (const entry of body.entry ?? []) {
    for (const messaging of entry.messaging ?? []) {
      // is_echo === true는 이 계정(봇 포함) 스스로 보낸 메시지가 되돌아온 이벤트다. 걸러내지
      // 않으면 봇이 보낸 답장을 "새 수신 메시지"로 착각해 또 답장하는 무한 루프가 생길 수
      // 있다(threads-comment-reply에서 발견한 자기 답글 루프와 같은 버그 계열, 2026-08-26).
      if (messaging.message?.is_echo) continue;

      const senderId = messaging.sender?.id;
      const text = messaging.message?.text;
      const mid = messaging.message?.mid;
      if (!senderId || !text || !mid) continue;

      try {
        await processIncomingDmMessage(admin, userId, {
          senderId,
          igMessageId: mid,
          text,
          timestampMs: messaging.timestamp ?? Date.now(),
        });
      } catch (err) {
        console.error(`DM 웹훅 처리 실패 (user ${userId}, mid ${mid}):`, err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
