import "server-only";
import crypto from "crypto";

// Instagram DM 웹훅은 사용자마다 자기 Meta 앱을 쓰므로, URL 경로에 user_id를 넣어 어느
// 사용자의 계정으로 온 이벤트인지 구분한다(app/api/instagram/dm-webhook/[userId]/route.ts).
// Meta의 GET 검증 핸드셰이크(hub.mode/hub.challenge/hub.verify_token)에 쓸 verify_token은
// telegram/webhookSecret.ts의 computeWebhookSecret과 동일한 HMAC 패턴으로, 이 앱만 아는
// CRON_SECRET을 시드로 계산해서 별도 DB 컬럼 없이 매번 재검증한다. 텔레그램 웹훅과 값이
// 겹치지 않도록 접미사를 다르게 둔다.
export function computeInstagramVerifyToken(userId: string): string {
  const seed = process.env.CRON_SECRET;
  if (!seed) throw new Error("CRON_SECRET이 설정되어 있지 않습니다.");
  return crypto.createHmac("sha256", seed).update(`ig-dm-verify:${userId}`).digest("hex");
}

/**
 * Meta가 POST 웹훅 요청에 붙이는 X-Hub-Signature-256 헤더를 해당 사용자의 meta_app_secret으로
 * 검증한다. 이 앱은 사용자별로 서로 다른 Meta 앱을 쓰므로(본인 앱 패턴), 서명 검증에도 그
 * 사용자의 app secret을 써야 한다 — 공용 시크릿이 아니다.
 */
export function verifyInstagramWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;
  const [algo, providedHex] = signatureHeader.split("=");
  if (algo !== "sha256" || !providedHex) return false;

  const expectedHex = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}
