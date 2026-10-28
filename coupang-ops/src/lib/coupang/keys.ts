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

/** 화면 표시용 가림(끝 4자리만) */
export function maskKey(value: string): string {
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}
