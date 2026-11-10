import "server-only";
import { decodeResponse, encodeEucKr, pickTag } from "@/lib/elevenst/xml";

// 11번가 Seller API 호출 컴포넌트 — 명세 정리: elevenst-register/docs/API_SPEC_NOTES.md
// - 인증: 헤더 openapikey(회원 본인 키만). 본문은 EUC-KR XML.
// - 출발지: 11번가는 해외 IP 접속을 끊는다(2026-11-11 진단: Fixie 미국 IP → connection refused, 한국 PC 직접 → 200).
//   그래서 이 프로그램은 Vercel 서울 지역(vercel.json regions icn1)에서 돌고, 11번가는 프록시 없이 직접 부른다.
//   (조회는 「API 관리」 등록 IP가 아니어도 됐다. 쓰기 API가 등록 IP를 요구하면 국내 고정 IP 방안을 다시 정한다 — 플랜 §0단계 결과.)
// - 재시도 없음: 등록·수정·전시중지는 두 번 보내면 중복이 생기므로, 조회도 단순하게 한 번만 보낸다.

export const ELEVENST_HOST = "https://api.11st.co.kr";
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

/** 이 서버가 지금 밖으로 나가는 IP(연결 시험 실패 안내용). 못 읽으면 빈 문자열 */
export async function outgoingIp(): Promise<string> {
  try {
    const r = await fetch("https://api.ipify.org", { signal: AbortSignal.timeout(8_000), cache: "no-store" });
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
  const isXml = body.trimStart().startsWith("<");
  const code = pickTag(body, "resultCode");
  const b = body.toLowerCase();
  if (!isXml) return `11번가 서버에 닿지 못했습니다(${status}). 잠시 뒤 다시 시도해 주세요. 계속되면 관리자에게 알려 주세요.`;
  if (code === "-200" || b.includes("unregisteredkey") || status === 401) {
    return `11번가가 키를 받아들이지 않았습니다${said ? `(${said})` : ""}. 「API 관리」의 키를 그대로 복사했는지, 만료되지 않았는지 확인해 주세요.`;
  }
  if (b.includes("accessdeny") || status === 403) {
    return `11번가가 이 요청을 거절했습니다${said ? `(${said})` : ""}. 11번가 「API 관리 › 접속권한」 설정을 확인해 주세요.`;
  }
  if (b.includes("overedtraffic")) return "11번가 하루 호출 한도를 넘었습니다. 내일 다시 시도해 주세요.";
  return `11번가 요청이 실패했습니다(${status})${said ? `: ${said}` : ""}.`;
}

/** 11번가 Seller API 호출. path는 「/rest/...」, xml은 보낼 본문(EUC-KR로 바꿔 보냄). 응답은 글자(XML)로 돌려준다 */
export async function elevenstRequest(apiKey: string, method: "GET" | "POST" | "PUT", path: string, xml?: string): Promise<{ status: number; text: string }> {
  let response: Response;
  try {
    response = await fetch(`${ELEVENST_HOST}${path}`, {
      method,
      headers: { openapikey: apiKey, ...(xml ? { "Content-Type": "text/xml; charset=EUC-KR" } : {}) },
      body: xml ? new Uint8Array(encodeEucKr(xml)) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new ElevenstApiError("11번가에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 0, String((e as Error)?.message ?? ""));
  }
  const text = decodeResponse(new Uint8Array(await response.arrayBuffer()));
  if (!response.ok) throw new ElevenstApiError(elevenstErrorMessage(response.status, text), response.status, text);
  return { status: response.status, text };
}
