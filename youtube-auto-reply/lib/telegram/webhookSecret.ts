import "server-only";
import crypto from "crypto";

// 텔레그램 웹훅은 사용자마다 자기 봇을 따로 쓰므로, URL 경로에 user_id를 넣어 어느
// 사용자의 업데이트인지 구분한다(app/api/telegram/webhook/[userId]/route.ts). URL만으로는
// 다른 사람이 흉내낼 수 있으니, setWebhook의 secret_token으로 이 값을 함께 등록해
// X-Telegram-Bot-Api-Secret-Token 헤더를 검증한다 — 이 앱만 아는 CRON_SECRET을 시드로 한
// HMAC이라 별도 DB 컬럼 없이 계산만으로 매번 재검증할 수 있다.
export function computeWebhookSecret(userId: string): string {
  const seed = process.env.CRON_SECRET;
  if (!seed) throw new Error("CRON_SECRET이 설정되어 있지 않습니다.");
  return crypto.createHmac("sha256", seed).update(userId).digest("hex");
}
