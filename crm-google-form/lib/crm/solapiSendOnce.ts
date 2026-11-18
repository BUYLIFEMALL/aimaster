import "server-only";
import { createHmac, randomBytes } from "node:crypto";

/*
 * crm-google-form 접수 확인 발송 전용 SOLAPI 1회 전송기(CRM B′, 2026-11-18 Master 판정 msg_b0197652e14b).
 *
 * 왜 공용 래퍼(lib/solapi/client.ts, 공용 기준 코드 solapi-client)를 쓰지 않는가:
 *   공식 solapi SDK(설치 6.0.1, 최신 6.1.0 master 포함)는 연결 끊김(aborted·refused·reset·econn)·HTTP 503에서
 *   스스로 최대 3번 다시 보내며 끄는 옵션·전송기 주입이 없다(dist/index.js:1405-1413, constructor(apiKey, apiSecret)만).
 *   그래서 첫 시도가 서버에서 처리됐는데도 다시 보내 신청자에게 접수 문자가 두 번 갈 수 있다.
 * 범위: 이 프로그램의 「접수 확인」 문자·알림톡·친구톡만. 공용 래퍼·사본 5곳·팔로우업은 그대로 SDK를 쓴다
 *   (공용 래퍼의 「SDK가 서명을 처리하고 직접 구현하지 않는다」 원칙은 그대로 유지 — 이것은 좁은 예외).
 * 공식 근거: SOLAPI API 키 인증 문서 https://solapi.com/developers/api/authentication-api-key (HMAC-SHA256),
 *   공식 REST 발송 POST https://api.solapi.com/messages/v4/send-many/detail, 응답 계약은 공식 SDK 스키마
 *   (detailGroupMessageResponseSchema: failedMessageList + groupInfo.count{total, registeredFailed, registeredSuccess…}).
 * 보장: 이 함수는 fetch를 정확히 1번만 부른다(재시도 0). 서명은 node:crypto 표준 HMAC-SHA256만(자체 암호 0).
 * 기록: 키·번호·본문·서버 원문을 반환·로그에 남기지 않는다(고정 사유 코드만).
 */

export const SOLAPI_SEND_URL = "https://api.solapi.com/messages/v4/send-many/detail";
export const SEND_DEADLINE_MS = 15_000;
export const MAX_RESPONSE_BYTES = 64 * 1024;

export interface SolapiAccount {
  api_key: string;
  api_secret: string;
  sender_phone: string;
  kakao_pf_id: string | null;
}

export type OnceMessage =
  | { kind: "sms"; to: string; text: string }
  | { kind: "alimtalk"; to: string; templateId: string; variables: Record<string, string> }
  | { kind: "friendtalk"; to: string; text: string };

export interface OnceResult {
  outcome: "sent" | "rejected" | "unknown";
  /** 이 호출에서 실제로 부른 HTTP 횟수(0 또는 1) */
  httpCalls: 0 | 1;
  /** 고정 사유 코드(원문 0) */
  reason:
    | "accepted"
    | "precheck"
    | "registration_failed"
    | "client_rejected"
    | "rate_limited"
    | "server_error"
    | "network"
    | "bad_response"
    | "unexpected_status";
}

export interface OnceDeps {
  fetch?: typeof fetch;
  now?: () => Date;
  salt?: () => string;
  deadlineMs?: number;
}

/** 공식 SDK와 같은 번호 정리: 하이픈만 지우고 숫자만 남아야 한다(그 밖은 요청 전 거절). */
export function normalizePhone(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/-/g, "");
  return s.trim().length > 0 && /^[0-9]+$/.test(s) ? s : null;
}

/** 공식 HMAC-SHA256 API 키 인증 헤더. signature = hex(HMAC-SHA256(apiSecret, date + salt)). */
export function buildAuthHeader(apiKey: string, apiSecret: string, date: string, salt: string): string {
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 요청 본문(공식 SDK가 같은 입력으로 보내는 messages 항목과 같은 필드). 사전 검증 실패면 null. */
export function buildSendBody(account: SolapiAccount, msg: OnceMessage): { messages: Record<string, unknown>[] } | null {
  const to = normalizePhone(msg.to);
  const from = normalizePhone(account.sender_phone);
  if (!to || !from) return null;
  if (msg.kind === "sms") {
    if (!msg.text) return null;
    return { messages: [{ text: msg.text, to, from }] };
  }
  if (!account.kakao_pf_id) return null;
  if (msg.kind === "alimtalk") {
    if (!msg.templateId) return null;
    return { messages: [{ kakaoOptions: { pfId: account.kakao_pf_id, templateId: msg.templateId, variables: msg.variables }, to, from }] };
  }
  if (!msg.text) return null;
  return { messages: [{ text: msg.text, type: "CTA", kakaoOptions: { pfId: account.kakao_pf_id, adFlag: false }, to, from }] };
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
const isCount = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0;

/** 공식 SDK failedMessageSchema의 필수 문자열 필드(설치 6.0.1 dist/index.js:2717-2731) */
const FAILED_ITEM_FIELDS = ["to", "from", "type", "statusMessage", "country", "messageId", "statusCode", "accountId"] as const;

/** 실패 목록 항목 1개가 공식 스키마와 맞는지: 필수 필드 모두 문자열, customFields는 없거나 문자열 값만 가진 객체. */
function isFailedItem(x: unknown): boolean {
  if (!isPlainObject(x)) return false;
  for (const k of FAILED_ITEM_FIELDS) if (typeof x[k] !== "string") return false;
  if (x.customFields !== undefined) {
    if (!isPlainObject(x.customFields)) return false;
    for (const v of Object.values(x.customFields)) if (typeof v !== "string") return false;
  }
  return true;
}

/** 오류 봉투(errorCode·errorMessage) 흔적이 하나라도 있는지 */
const hasErrorEnvelope = (b: Record<string, unknown>) => "errorCode" in b || "errorMessage" in b;
/** 발송 결과 흔적(failedMessageList·groupInfo)이 하나라도 있는지 */
const hasSendResult = (b: Record<string, unknown>) => "failedMessageList" in b || "groupInfo" in b;

/**
 * 2xx 본문을 공식 응답 계약으로 엄격히 분류(1건 발송 기준). 계약과 다르거나 서로 모순되면 unknown.
 * 근거로 쓰는 범위는 설치된 공식 SDK의 detailGroupMessageResponseSchema·failedMessageSchema·countSchema뿐이며,
 * 그 밖의 필드(예: 실패 항목의 to·from이 요청 번호와 같은지)는 확인된 계약이 아니라 판정에 쓰지 않는다.
 * 「sent」는 SOLAPI가 접수(registered)했다는 뜻이지 최종 배달 보장이 아니다.
 */
export function classifySuccessBody(body: unknown): Pick<OnceResult, "outcome" | "reason"> {
  const unknown = { outcome: "unknown" as const, reason: "bad_response" as const };
  if (!isPlainObject(body) || hasErrorEnvelope(body)) return unknown; // 성공 응답에 오류 봉투가 섞이면 모순
  if (!Array.isArray(body.failedMessageList) || !isPlainObject(body.groupInfo)) return unknown;
  const count = (body.groupInfo as Record<string, unknown>).count;
  if (!isPlainObject(count) || !isCount(count.total) || !isCount(count.registeredFailed) || !isCount(count.registeredSuccess)) {
    return unknown;
  }
  const list = body.failedMessageList;
  if (!list.every(isFailedItem)) return unknown;
  if (list.length !== count.registeredFailed) return unknown; // 실패 목록 개수와 접수 실패 개수가 다르면 모순
  if (count.total === 1 && count.registeredSuccess === 1 && count.registeredFailed === 0) {
    return { outcome: "sent", reason: "accepted" };
  }
  if (count.total === 1 && count.registeredFailed === 1 && count.registeredSuccess === 0) {
    return { outcome: "rejected", reason: "registration_failed" };
  }
  return unknown;
}

/** 본문을 상한까지만 읽는다. 상한 초과·읽기 실패면 null. */
async function readCapped(res: Response, cap: number): Promise<string | null> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > cap) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const all = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    all.set(c, off);
    off += c.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(all);
  } catch {
    return null;
  }
}

/**
 * 메시지 1건을 SOLAPI에 정확히 1번만 보낸다(재시도 0).
 * sent = 공식 계약상 접수 성공 / rejected = 요청 전 검증 실패(HTTP 0) 또는 서버가 명시적으로 거절
 *   (4xx + 공식 오류 본문 {errorCode, errorMessage}, 429 제외) 또는 공식 계약상 접수 실패 / unknown = 그 밖 전부.
 */
export async function sendSolapiOnce(account: SolapiAccount, msg: OnceMessage, deps: OnceDeps = {}): Promise<OnceResult> {
  if (!account.api_key || !account.api_secret) return { outcome: "rejected", httpCalls: 0, reason: "precheck" };
  const body = buildSendBody(account, msg);
  if (!body) return { outcome: "rejected", httpCalls: 0, reason: "precheck" };

  const doFetch = deps.fetch ?? globalThis.fetch;
  const date = (deps.now ?? (() => new Date()))().toISOString();
  const salt = (deps.salt ?? (() => randomBytes(16).toString("hex")))();
  const signal = AbortSignal.timeout(deps.deadlineMs ?? SEND_DEADLINE_MS); // 헤더·본문 읽기까지 전체 마감

  let res: Response;
  try {
    res = await doFetch(SOLAPI_SEND_URL, {
      method: "POST",
      headers: { Authorization: buildAuthHeader(account.api_key, account.api_secret, date, salt), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "error",
      signal,
    });
  } catch {
    return { outcome: "unknown", httpCalls: 1, reason: "network" };
  }

  const text = await readCapped(res, MAX_RESPONSE_BYTES);
  const status = res.status;
  if (status === 429) return { outcome: "unknown", httpCalls: 1, reason: "rate_limited" };
  if (status >= 500) return { outcome: "unknown", httpCalls: 1, reason: "server_error" };
  if (text === null) return { outcome: "unknown", httpCalls: 1, reason: "bad_response" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { outcome: "unknown", httpCalls: 1, reason: "bad_response" };
  }
  if (status >= 200 && status < 300) return { ...classifySuccessBody(parsed), httpCalls: 1 };
  if (status >= 400 && status < 500) {
    // 4xx는 공식 오류 봉투만 있고 발송 결과 흔적이 없을 때만 명시 거절(오류 봉투 + 성공 개수 공존 = 모순 → unknown)
    if (isPlainObject(parsed) && typeof parsed.errorCode === "string" && typeof parsed.errorMessage === "string" && !hasSendResult(parsed)) {
      return { outcome: "rejected", httpCalls: 1, reason: "client_rejected" };
    }
    return { outcome: "unknown", httpCalls: 1, reason: "bad_response" };
  }
  return { outcome: "unknown", httpCalls: 1, reason: "unexpected_status" };
}
