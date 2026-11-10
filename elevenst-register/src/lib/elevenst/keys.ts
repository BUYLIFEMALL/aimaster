// 11번가 키·고정 IP — 공용 표 user_api_keys에 저장한다(다른 프로그램도 재사용). 운영자·다른 회원 값으로 폴백하지 않는다.
// - elevenst_api_key: 상품소싱기(trending-product-finder)도 쓰는 11번가 Open API 키(11번가 「API 관리」의 키 하나)
// - fixed_ip_proxy_url: 쿠팡 운영(coupang-ops)과 같은 회원 본인 고정 IP 주소(Fixie). 검사 규칙도 쿠팡 운영 keys.ts와 같다.

export const ELEVENST_KEY = "elevenst_api_key";
export const PROXY_KEY = "fixed_ip_proxy_url";

/** 11번가 API 키 형식 검사(OPEN API 센터 안내: 32자리). 모양이 조금 달라도 저장은 막지 않도록 영문·숫자 20~64자로 넓게 본다 */
export function validateElevenstKey(raw: unknown): { key?: string; error?: string } {
  const v = String(raw ?? "").trim();
  if (!v) return { error: "11번가 API 키를 넣어 주세요." };
  if (!/^[0-9a-zA-Z]{20,64}$/.test(v)) return { error: "키 모양이 맞지 않습니다. 11번가 「API 관리」 화면의 키를 그대로 복사해 주세요(공백 없이 영문·숫자)." };
  return { key: v };
}

/** 고정 IP 주소 형식 검사. 서버가 이 주소로 접속하므로 내부망 주소는 받지 않는다 */
export function validateProxyUrl(raw: unknown): { url?: string; error?: string } {
  const text = String(raw ?? "").trim();
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return { error: "주소 모양이 맞지 않습니다. http://fixie:토큰@내주소.usefixie.com:80 형태로 넣어 주세요." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { error: "http:// 또는 https://로 시작하는 주소를 넣어 주세요." };
  const host = u.hostname.toLowerCase();
  const internal = !host.includes(".") || host.startsWith("[") || host.endsWith(".local") || /^(127|10|0)\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (internal) return { error: "이 주소는 쓸 수 없습니다. Fixie 화면의 주소를 그대로 복사해 주세요." };
  return { url: text };
}

/** 화면 표시용: 비밀번호를 가린 주소 */
export function maskProxyUrl(value: string): string {
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.username || u.password ? "••••@" : ""}${u.host}`;
  } catch {
    return "••••";
  }
}

/** 화면 표시용 가림(끝 4자리만) */
export function maskKey(value: string): string {
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}
