// 연결 문 보안 — 우리 사이트에서 온 요청만 받고, 짝짓기로 받은 토큰이 있어야 생성을 맡긴다.
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const SITE_ORIGINS = ["https://free-music-studio.buylife.xyz"];
// 개발 중 내 PC에서 띄운 웹(next dev)도 허용
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  return SITE_ORIGINS.includes(origin) || DEV_ORIGIN.test(origin);
}

export function corsHeaders(origin) {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/** 엔진 창에 보여 줄 6자리 짝짓기 코드 */
export const newPairCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export const newToken = () => randomBytes(32).toString("hex");

export function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** `Authorization: Bearer <토큰>`에서 토큰만 꺼낸다 */
export function bearer(header) {
  const m = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return m ? m[1] : null;
}
