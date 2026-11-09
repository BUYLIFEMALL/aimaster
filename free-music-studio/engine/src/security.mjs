// 연결 문 보안 — 우리 사이트에서 온 요청만 받고, 짝짓기로 받은 토큰이 있어야 생성을 맡긴다.
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";

// 엔진 0.8.1(D-3, 2026-11-09 주인님 「1안으로 진행해」): 이미지 자동화도 같은 엔진의 내 PC 그림을 쓴다 — 그림 주소만(imageSiteAllows)
export const IMAGE_SITE = "https://ai-image-studio.buylife.xyz";
export const SITE_ORIGINS = ["https://free-music-studio.buylife.xyz", IMAGE_SITE];

const ART = /^\/image-art\/[0-9a-f-]{36}$/;
const CANCEL = /^\/queue\/[0-9a-f-]{36}\/cancel$/;
const JOB = /^\/queue\/[0-9a-f-]{36}$/;
const DEFAULT = /^\/image-models\/[A-Za-z0-9_.:-]{1,80}\/default$/;
/** 이미지 자동화에서 온 요청이 쓸 수 있는 주소 — 그림 판 목록·기본 판, 대기열(그림 작업만, 접수에서 한 번 더 확인), 그린 그림 받기, 취소·지우기 */
export function imageSiteAllows(method, pathname) {
  if (method === "GET") return pathname === "/image-models" || pathname === "/queue" || ART.test(pathname);
  if (method === "POST") return pathname === "/queue" || DEFAULT.test(pathname) || CANCEL.test(pathname);
  if (method === "DELETE") return JOB.test(pathname);
  return false;
}
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
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range, X-Offset",
    "Access-Control-Max-Age": "600",
    "Access-Control-Expose-Headers": "x-audio-format, content-range, accept-ranges",
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
