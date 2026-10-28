import crypto from "node:crypto";

// 쿠팡 WING 서명(HMAC-SHA256 「CEA」) — server-only 없이 시험할 수 있게 client.ts에서 분리.

export type WingMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** signed-date 형식 yyMMdd'T'HHmmss'Z'(UTC) */
export function wingSignedDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${String(now.getUTCFullYear()).slice(2)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

/** Authorization 머리글. 서명 대상 = signedDate + method + path + query (path와 query 사이에 "?"를 넣지 않는다) */
export function buildWingAuthorization(method: WingMethod, path: string, query: string, keys: { accessKey: string; secretKey: string }, now = new Date()): string {
  const signedDate = wingSignedDate(now);
  const signature = crypto.createHmac("sha256", keys.secretKey).update(`${signedDate}${method}${path}${query}`).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${keys.accessKey}, signed-date=${signedDate}, signature=${signature}`;
}
