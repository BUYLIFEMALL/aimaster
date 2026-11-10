import "server-only";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { decodeResponse, encodeEucKr, pickTag } from "@/lib/elevenst/xml";

// 11번가 Seller API 호출 컴포넌트 — 명세 정리: elevenst-register/docs/API_SPEC_NOTES.md
// - 인증: 헤더 openapikey(회원 본인 키만). 본문은 EUC-KR XML.
// - 출발 IP: 11번가는 「API 관리」에 등록한 IP에서 온 요청만 받는다. 운영은 회원 본인 고정 IP(Fixie, 공용 fixed_ip_proxy_url)를 거친다
//   (운영자 주소 폴백 없음). 쿠팡 운영 lib/coupang/client.ts와 같은 방식.
// - 재시도 없음: 등록·수정·전시중지는 두 번 보내면 중복이 생기므로, 조회도 단순하게 한 번만 보낸다.

export const ELEVENST_HOST = "http://api.11st.co.kr";
const TIMEOUT_MS = 20_000;

export class ElevenstApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "ElevenstApiError";
  }
}

const agents = new Map<string, ProxyAgent>();
function dispatcher(url: string | undefined): ProxyAgent | undefined {
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new ElevenstApiError("먼저 「API키등록·플랫폼연동」에서 내 고정 IP 주소(Fixie)를 등록해 주세요.", 0, "");
    return undefined; // 개발 PC: 이 PC 공인 IP가 11번가 「API 관리」에 있어야 함
  }
  if (!agents.has(url) && agents.size >= 50) agents.clear();
  if (!agents.has(url)) agents.set(url, new ProxyAgent(url));
  return agents.get(url);
}

/** 회원 프록시로 실제 나가는 IP(연결 시험 실패 안내용, Fixie 호출 1회). 못 읽으면 빈 문자열 */
export async function outgoingIp(proxyUrl: string | undefined): Promise<string> {
  if (!proxyUrl) return "";
  try {
    const r = await undiciFetch("https://api.ipify.org", { dispatcher: dispatcher(proxyUrl), signal: AbortSignal.timeout(8_000) });
    return r.ok ? (await r.text()).trim().slice(0, 45) : "";
  } catch {
    return "";
  }
}

/** 응답에서 11번가가 준 오류 문구를 찾는다(오류 형식이 API마다 달라 흔한 태그를 차례로 본다) */
export function elevenstMessage(xml: string): string {
  for (const tag of ["resultMessage", "result_message", "message", "errorMessage", "ErrorMessage", "msg"]) {
    const v = pickTag(xml, tag);
    if (v && v.toUpperCase() !== "SUCCESS") return v.slice(0, 300);
  }
  return "";
}

/** 상태·응답으로 회원에게 보여 줄 안내 */
export function elevenstErrorMessage(status: number, body: string): string {
  const said = elevenstMessage(body);
  const b = body.toLowerCase();
  if (b.includes("accessdeny") || b.includes("접근") || status === 403) {
    return `11번가가 요청을 거절했습니다${said ? `(${said})` : ""}. 11번가 「API 관리 › IP 직접 입력: 사용 › 실서버 IP」에 내 고정 IP 2개를 넣고 저장했는지 확인해 주세요.`;
  }
  if (b.includes("unregisteredkey") || b.includes("미등록") || status === 401) {
    return `11번가가 키를 받아들이지 않았습니다${said ? `(${said})` : ""}. 「API 관리」의 키를 그대로 복사했는지, 만료되지 않았는지 확인해 주세요.`;
  }
  if (b.includes("overedtraffic")) return "11번가 하루 호출 한도를 넘었습니다. 내일 다시 시도해 주세요.";
  if (status >= 500) return `11번가 서버가 응답하지 못했습니다(${status})${said ? `: ${said}` : ""}. 잠시 뒤 다시 시도해 주세요.`;
  return `11번가 요청이 실패했습니다(${status})${said ? `: ${said}` : ""}.`;
}

export type ElevenstKeys = { apiKey: string; proxyUrl?: string };

/** 11번가 Seller API 호출. path는 「/rest/...」, xml은 보낼 본문(EUC-KR로 바꿔 보냄). 응답은 글자(XML)로 돌려준다 */
export async function elevenstRequest(keys: ElevenstKeys, method: "GET" | "POST" | "PUT", path: string, xml?: string): Promise<{ status: number; text: string }> {
  let response;
  try {
    response = await undiciFetch(`${ELEVENST_HOST}${path}`, {
      method,
      headers: { openapikey: keys.apiKey, ...(xml ? { "Content-Type": "text/xml; charset=EUC-KR" } : {}) },
      body: xml ? encodeEucKr(xml) : undefined,
      dispatcher: dispatcher(keys.proxyUrl),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof ElevenstApiError) throw e;
    throw new ElevenstApiError("11번가에 연결하지 못했습니다. 내 고정 IP 주소(Fixie)가 맞는지, 이번 달 사용량이 남았는지 확인해 주세요.", 0, String((e as Error)?.message ?? ""));
  }
  const text = decodeResponse(new Uint8Array(await response.arrayBuffer()));
  if (!response.ok) throw new ElevenstApiError(elevenstErrorMessage(response.status, text), response.status, text);
  return { status: response.status, text };
}
