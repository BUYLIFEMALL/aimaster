// 공용 발행 엔진 — 통신 공통(시간 제한·오류 분류). 재시도는 하지 않는다(이중 발행 방지).
import { PublishError, type PublishErrorCode } from "./types";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface HttpOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  timeoutMs?: number;
  /** 같은 요청을 다시 보내도 결과가 같은가(조회=true, 글 만들기=false) */
  idempotent?: boolean;
  fetchImpl?: FetchLike;
}

export interface HttpResult {
  status: number;
  text: string;
  json: unknown;
  headers: Headers;
}

const NOT_SENT_CODES = new Set(["ENOTFOUND", "ECONNREFUSED", "EAI_AGAIN", "ERR_INVALID_URL", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"]);

function causeCode(e: unknown): string {
  const c = (e as { cause?: { code?: string } })?.cause;
  return String(c?.code ?? (e as { code?: string })?.code ?? "");
}

export async function http(url: string, opts: HttpOptions = {}): Promise<HttpResult> {
  const { method = "GET", headers = {}, body = null, timeoutMs = 30_000, fetchImpl = fetch } = opts;
  const idempotent = opts.idempotent ?? method === "GET";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(url, { method, headers, body, signal: ctrl.signal, redirect: "follow" });
  } catch (e) {
    clearTimeout(timer);
    // fetchImpl이 이미 분류한 오류(예: 내부망 주소 차단)는 그대로 넘긴다 — 요청이 나가지 않았다.
    if (e instanceof PublishError) throw e;
    const code = causeCode(e);
    const aborted = (e as Error)?.name === "AbortError" || ctrl.signal.aborted;
    if (NOT_SENT_CODES.has(code)) {
      throw new PublishError("network", `사이트에 연결하지 못했습니다(${code}). 주소를 확인해 주세요.`);
    }
    if (idempotent) throw new PublishError("network", aborted ? "응답이 늦어 중단했습니다. 잠시 뒤 다시 시도해 주세요." : "연결이 끊겼습니다. 잠시 뒤 다시 시도해 주세요.");
    throw new PublishError("uncertain", aborted ? "응답이 늦어 결과를 확인하지 못했습니다. 블로그에서 글이 올라갔는지 먼저 확인해 주세요." : "전송 중 연결이 끊겨 결과를 확인하지 못했습니다. 블로그에서 글이 올라갔는지 먼저 확인해 주세요.");
  }
  let text = "";
  try {
    text = await res.text();
  } catch {
    clearTimeout(timer);
    if (idempotent) throw new PublishError("network", "응답을 끝까지 받지 못했습니다.");
    throw new PublishError("uncertain", "응답을 끝까지 받지 못해 결과를 확인하지 못했습니다. 블로그에서 먼저 확인해 주세요.", { status: res.status });
  }
  clearTimeout(timer);
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: res.status, text, json, headers: res.headers };
}

/** 상태 번호 → 오류 분류(성공이 아닌 응답을 받았을 때) */
export function codeForStatus(status: number): PublishErrorCode {
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404 || status === 410) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "bad_request";
  return "server";
}
