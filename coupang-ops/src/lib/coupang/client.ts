import "server-only";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import type { WingKeys } from "@/lib/coupang/keys";
import { buildWingAuthorization, type WingMethod as Method } from "@/lib/coupang/sign";

// 쿠팡 WING Open API 호출 컴포넌트(C1-3).
// - 서명: HMAC-SHA256 「CEA」 방식. 서명 규칙은 쿠팡 파트너스와 같고, 실계정으로 확인된
//   threads-affiliate-poster/src/lib/affiliate-clients/coupangApi.ts `buildCoupangAuthorization`과 같은 규칙이다
//   (프로그램끼리 코드를 불러 쓰지 않으므로 이 앱에 따로 둔다).
// - 출발 IP: 쿠팡은 요청마다 허용 IP를 검사한다. 운영은 Fixie 고정 IP 프록시(FIXIE_URL, 운영자 인프라)를 거친다.
//   개발 PC는 회원이 WING 허용 IP에 이 PC IP도 넣은 경우에만 프록시 없이 직접 부를 수 있다(운영에서는 직접 호출 금지).
// - 재시도: 429(호출 한도)는 GET만 1회 기다렸다 다시 보낸다. 생성·수정(POST/PUT/DELETE)은 중복을 막으려고 다시 보내지 않는다.

export const WING_HOST = "https://api-gateway.coupang.com";
const TIMEOUT_MS = 20_000;

export class WingApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "WingApiError";
  }
}

function proxyUrl(): string {
  return (process.env.FIXIE_URL ?? "").trim();
}

let agent: { url: string; agent: ProxyAgent } | null = null;
function dispatcher(): ProxyAgent | undefined {
  const url = proxyUrl();
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new WingApiError("쿠팡 연결용 고정 IP 프록시(FIXIE_URL)가 이 서버에 아직 설정되지 않았습니다. 운영자에게 알려 주세요.", 0, "");
    return undefined; // 개발 PC: 이 PC 공인 IP가 WING 허용 IP에 있어야 함
  }
  if (!agent || agent.url !== url) agent = { url, agent: new ProxyAgent(url) };
  return agent.agent;
}

/** 상태 코드·응답으로 회원에게 보여 줄 안내를 만든다 */
export function wingErrorMessage(status: number, body: string): string {
  const b = body.toLowerCase();
  if (status === 401 || b.includes("invalid signature") || b.includes("not registered")) {
    return "쿠팡이 키를 받아들이지 않았습니다. 업체코드·Access Key·Secret Key가 WING 화면과 같은지, 키가 만료(6개월)되지 않았는지 확인해 주세요. 발급 직후라면 최대 24시간 걸릴 수 있습니다.";
  }
  if (status === 403) {
    return "쿠팡이 이 요청의 출발 IP를 허용하지 않았습니다. WING 「연동 정보」가 「자체개발」인지, 허용 IP에 우리 서버 IP가 들어 있는지 확인해 주세요(등록 후 반영까지 30분~1시간).";
  }
  if (status === 429) return "쿠팡 호출 한도에 잠시 걸렸습니다. 1~2분 뒤 다시 시도해 주세요.";
  if (status >= 500) return `쿠팡 서버가 응답하지 못했습니다(${status}). 잠시 뒤 다시 시도해 주세요.`;
  return `쿠팡 요청이 실패했습니다(${status}). ${body.slice(0, 200)}`;
}

export type WingResponse<T> = { data: T; status: number; warnings: string | null };

/**
 * 쿠팡 WING API 호출. path는 「/v2/...」, query는 「?」 없는 조회 조건(예: "pageNum=1&pageSize=10").
 * 회원 본인 키만 받는다(호출부가 getWingKeys로 본인 키를 넘김).
 */
export async function wingRequest<T = unknown>(
  keys: WingKeys,
  method: Method,
  path: string,
  options: { query?: string | URLSearchParams; body?: unknown } = {},
): Promise<WingResponse<T>> {
  const query = options.query ? String(options.query).replace(/^\?/, "") : "";
  const url = `${WING_HOST}${path}${query ? `?${query}` : ""}`;
  const send = () =>
    undiciFetch(url, {
      method,
      headers: {
        Authorization: buildWingAuthorization(method, path, query, keys),
        "Content-Type": "application/json;charset=UTF-8",
        "X-Requested-By": keys.vendorId,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      dispatcher: dispatcher(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  let response = await send();
  if (response.status === 429 && method === "GET") {
    await new Promise((r) => setTimeout(r, 3_000));
    response = await send();
  }
  const text = await response.text();
  const warnings = response.headers.get("x-cag-warnings");
  if (!response.ok) throw new WingApiError(wingErrorMessage(response.status, text), response.status, text);
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* JSON이 아니면 글자 그대로 */
  }
  return { data: data as T, status: response.status, warnings };
}
