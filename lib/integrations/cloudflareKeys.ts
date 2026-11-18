// 공용 「API 설정」 Cloudflare Workers AI 본인 키 2개(계정 ID + 토큰) — ECOM-20261118-06.
// 공용 이름은 ai-doc-chatbot compatible-chat·emotion-writer 무료 엔진과 같다(한 번 등록하면 재사용).
// 검사 규칙은 ai-doc-chatbot/src/lib/compatibleChat/config.ts credentialValue와 같다(공백·제어문자 금지, 4096자 이하, 계정 ID 32자리 hex).
// 이 모듈은 Cloudflare에 실제로 인증·호출하지 않는다. 응답에는 키 값·마스킹 문자열을 절대 넣지 않는다(등록 여부 boolean만).

export const CF_TOKEN_PROVIDER = "cloudflare_workers_ai_token";
export const CF_ACCOUNT_PROVIDER = "cloudflare_account_id";
export const CF_PROVIDERS = [CF_TOKEN_PROVIDER, CF_ACCOUNT_PROVIDER] as const;
/** 화면이 지금 보고 있는 회원 ID를 실어 보내는 머리글 — 서버의 현재 로그인 회원과 다르면 409(다른 탭 계정 전환 방지). */
export const EXPECTED_USER_HEADER = "x-expected-user-id";
const MAX_BODY = 16 * 1024;

export class CloudflareKeyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function cleanValue(value: unknown, label: string): string {
  if (typeof value !== "string") throw new CloudflareKeyError(`${label}을(를) 입력해 주세요.`);
  const v = value.trim();
  if (!v) throw new CloudflareKeyError(`${label}을(를) 입력해 주세요.`);
  if (v.length > 4096 || /\s|[\u0000-\u001f\u007f]/.test(v)) throw new CloudflareKeyError("공백이나 줄바꿈 없이 본인 키 값을 입력해 주세요.");
  return v;
}

/** 저장·수정은 언제나 두 값을 함께 받는다(계정·토큰 불일치·부분 저장 방지). */
export function validateCloudflarePair(body: unknown): { accountId: string; token: string } {
  const b = (body && typeof body === "object" ? body : {}) as { accountId?: unknown; token?: unknown };
  const accountId = cleanValue(b.accountId, "Cloudflare 계정 ID");
  const token = cleanValue(b.token, "Cloudflare API 토큰");
  if (!/^[a-f0-9]{32}$/i.test(accountId))
    throw new CloudflareKeyError("Cloudflare 계정 ID는 로그인 이메일이 아닙니다. Workers & Pages의 Account Details에서 복사한 32자리 영문·숫자 값을 입력해 주세요.");
  return { accountId, token };
}

export type CloudflareKeyStore = {
  /** 회원 본인 행에서 허용 2개 provider만 읽는다. */
  select(userId: string): Promise<{ data: { provider: string }[] | null; error: unknown }>;
  /** 두 행을 한 문장으로 저장(원자). */
  upsertPair(userId: string, rows: { user_id: string; provider: string; api_key: string; updated_at: string }[]): Promise<{ error: unknown }>;
  /** 같은 회원의 두 provider를 한 문장으로 삭제. */
  deletePair(userId: string): Promise<{ error: unknown }>;
};
export type CloudflareKeyDeps = {
  getUserId(): Promise<string | null>;
  /** true=정지, false=정상, null=확인 실패 */
  isSuspended(userId: string): Promise<boolean | null>;
  store: CloudflareKeyStore;
};

const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const fail = (message: string, status: number) => json({ error: message }, status);

/** 같은 사이트에서 온 요청인지(쓰기 요청 CSRF 방어). Origin이 없거나 다른 곳이면 거절. */
function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readJson(req: Request): Promise<unknown> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
    throw new CloudflareKeyError("요청 형식을 확인해 주세요.", 415);
  const text = await req.text();
  if (text.length > MAX_BODY) throw new CloudflareKeyError("요청이 너무 큽니다.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new CloudflareKeyError("요청 형식을 확인해 주세요.");
  }
}

export async function handleCloudflareKeys(method: string, req: Request, deps: CloudflareKeyDeps): Promise<Response> {
  try {
    if (!["GET", "POST", "DELETE"].includes(method)) return fail("지원하지 않는 요청입니다.", 405);
    if (method !== "GET") {
      if (!sameOrigin(req)) return fail("이 화면에서만 저장·해제할 수 있습니다.", 403);
      if ([...new URL(req.url).searchParams.keys()].length > 0) return fail("요청 형식을 확인해 주세요.", 400);
    }
    const userId = await deps.getUserId();
    if (!userId) return fail("로그인이 필요합니다.", 401);
    const suspended = await deps.isSuspended(userId);
    if (suspended === null) return fail("회원 상태를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 503);
    if (suspended) return fail("이용이 정지된 계정입니다.", 403);
    const expected = req.headers.get(EXPECTED_USER_HEADER);
    if (!expected) return fail("요청 형식을 확인해 주세요.", 400);
    if (expected !== userId) return fail("다른 계정으로 바뀌었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.", 409);

    if (method === "GET") {
      const { data, error } = await deps.store.select(userId);
      if (error) return fail("등록 상태를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
      const has = (p: string) => Boolean(data?.some((r) => r.provider === p));
      return json({ registered: { accountId: has(CF_ACCOUNT_PROVIDER), token: has(CF_TOKEN_PROVIDER) } });
    }
    if (method === "POST") {
      const { accountId, token } = validateCloudflarePair(await readJson(req));
      const now = new Date().toISOString();
      const { error } = await deps.store.upsertPair(userId, [
        { user_id: userId, provider: CF_ACCOUNT_PROVIDER, api_key: accountId, updated_at: now },
        { user_id: userId, provider: CF_TOKEN_PROVIDER, api_key: token, updated_at: now },
      ]);
      if (error) return fail("키를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
      return json({ registered: { accountId: true, token: true } });
    }
    const { error } = await deps.store.deletePair(userId);
    if (error) return fail("연결을 해제하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
    return json({ registered: { accountId: false, token: false } });
  } catch (e) {
    if (e instanceof CloudflareKeyError) return fail(e.message, e.status);
    return fail("요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
  }
}
