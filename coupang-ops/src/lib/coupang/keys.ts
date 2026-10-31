// 쿠팡 WING Open API 회원 키 — 공용 표 user_api_keys에 키 이름 4개로 저장한다(다른 프로그램도 재사용).
// 쿠팡 파트너스 키(coupang_access_key·coupang_secret_key)와는 다른 키다. 운영자·다른 회원 키로 폴백하지 않는다.

export const WING_KEYS = {
  vendorId: "coupang_wing_vendor_id",
  accessKey: "coupang_wing_access_key",
  secretKey: "coupang_wing_secret_key",
  wingUserId: "coupang_wing_user_id",
} as const;

export type WingField = keyof typeof WING_KEYS;
export type WingKeys = Record<WingField, string>;

export const WING_LABELS: Record<WingField, string> = {
  vendorId: "업체코드",
  accessKey: "Access Key",
  secretKey: "Secret Key",
  wingUserId: "WING 로그인 ID",
};

export const WING_FIELDS = Object.keys(WING_KEYS) as WingField[];

/** 입력값 검사 — 통과하면 정리된 값, 아니면 오류 문구 */
export function validateWingKeys(raw: Record<string, unknown>): { keys?: WingKeys; error?: string } {
  const v = Object.fromEntries(WING_FIELDS.map((f) => [f, String(raw[f] ?? "").trim()])) as WingKeys;
  const empty = WING_FIELDS.filter((f) => !v[f]);
  if (empty.length) return { error: `${empty.map((f) => WING_LABELS[f]).join(", ")}을(를) 넣어 주세요.` };
  if (!/^A\d{6,10}$/.test(v.vendorId)) return { error: "업체코드는 A로 시작하는 번호입니다(예: A00012345)." };
  if (!/^[0-9a-fA-F-]{20,64}$/.test(v.accessKey)) return { error: "Access Key 모양이 맞지 않습니다. WING 화면의 값을 그대로 복사해 주세요." };
  if (!/^[0-9a-fA-F]{20,128}$/.test(v.secretKey)) return { error: "Secret Key 모양이 맞지 않습니다. WING 화면의 값을 그대로 복사해 주세요." };
  if (v.accessKey.replace(/-/g, "").toLowerCase() === v.secretKey.toLowerCase()) return { error: "Access Key와 Secret Key가 같습니다. 두 칸을 확인해 주세요." };
  if (!/^[\w.@-]{2,60}$/.test(v.wingUserId)) return { error: "WING 로그인 ID를 확인해 주세요." };
  return { keys: v };
}

/** 회원 본인 고정 IP 프록시 주소(Fixie 등). 공용 표에 저장해 다른 프로그램도 재사용한다. 운영자 주소로 폴백하지 않는다 */
export const PROXY_KEY = "fixed_ip_proxy_url";

/** 형식 검사. 서버가 이 주소로 접속하므로 내부망 주소는 받지 않는다 */
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
