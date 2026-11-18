// 구글폼 웹훅 중복 방지 — 순수 함수(네트워크·DB 0). CRM-20261118-01 1단계.
// 아직 웹훅 라우트에 연결하지 않았다(2단계에서 연결). 설계: .ai/results/PORT-20261118-02-CC-B2B-BACK-01.md
//
// 본문 형식(명시적, 모양 추정 없음):
//   v2 시트: { v: 2, kind: "sheet", eventKey: "<스프레드시트ID>:<시트ID>:<행번호>:<타임스탬프ms 13자리>", values }
//     - 타임스탬프는 구글폼이 연결 시트 첫 칸에 적는 「제출 시각」 셀 값(Date.getTime()) — 같은 제출을
//       트리거가 두 번 보내도 같은 값이 되도록 스크립트 실행 시각이 아니라 셀 값을 쓴다.
//   v2 폼:   { v: 2, kind: "form",  eventKey: "<FormResponse.getId()>", values }
//   구버전:  v 칸이 없는 본문 → 지금처럼 처리, dedupeKey = null(중복 방지 안 됨). 내용 해시로 대신하지 않는다.
// 보장하지 않는 것: 시트 행을 지우거나 정렬해 같은 행 번호·같은 제출 시각이 다시 쓰이는 경우, 시트를 복사해
//   다른 파일로 옮긴 경우(파일 ID가 달라져 같은 응답도 다른 키), 제출 시각 셀 값을 사람이 고친 경우.
// 신뢰 경계: 웹훅 토큰이 formSourceId(회원·폼 연결)를 정하고, eventKey는 스크립트가 주장하는 값이다.
//   그래서 중복 범위는 항상 formSourceId 안이며(DB 유니크도 (form_source_id, dedupe_key)), 키를 바꿔 보내도
//   남의 접수에는 영향이 없다.

export const MAX_WEBHOOK_BODY_BYTES = 65536;
export const MAX_EVENT_KEY_LENGTH = 200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORM_KEY_RE = /^[A-Za-z0-9_-]{1,200}$/;
const SHEET_KEY_RE = /^[A-Za-z0-9_-]{20,100}:(0|[1-9][0-9]{0,9}):[1-9][0-9]{0,6}:[0-9]{13}$/;

export type WebhookKind = "sheet" | "form";

export type WebhookClassification =
  | { type: "v2"; formSourceId: string; kind: WebhookKind; dedupeKey: string }
  | { type: "legacy"; formSourceId: string; dedupeKey: null }
  | { type: "invalid"; status: 400; reason: "body" | "version" | "kind" | "eventKey" | "values" };

/** 본문 원문(req.text())의 실제 UTF-8 바이트 수로 크기를 잰다. Content-Length 머리글은 믿지 않는다. */
export function checkWebhookBodyBytes(
  raw: string,
): { ok: true; bytes: number } | { ok: false; status: 413; bytes: number } {
  if (typeof raw !== "string") throw new TypeError("raw body must be a string");
  const bytes = new TextEncoder().encode(raw).length;
  return bytes <= MAX_WEBHOOK_BODY_BYTES ? { ok: true, bytes } : { ok: false, status: 413, bytes };
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

/**
 * JSON.parse를 마친 본문을 v2·구버전·잘못된 형식으로 나눈다. 값을 고치거나(공백 제거·대소문자) 추정하지 않는다.
 * formSourceId는 서버가 토큰으로 찾은 값이라 UUID가 아니면 호출 쪽 실수로 보고 던진다.
 */
export function classifyWebhookBody(formSourceId: string, body: unknown): WebhookClassification {
  if (typeof formSourceId !== "string" || !UUID_RE.test(formSourceId)) {
    throw new TypeError("formSourceId must be a UUID");
  }
  if (!isPlainObject(body)) return { type: "invalid", status: 400, reason: "body" };
  if (!Object.prototype.hasOwnProperty.call(body, "v")) {
    return { type: "legacy", formSourceId, dedupeKey: null };
  }
  if (body.v !== 2) return { type: "invalid", status: 400, reason: "version" };

  const kind = body.kind;
  if (kind !== "sheet" && kind !== "form") return { type: "invalid", status: 400, reason: "kind" };

  const eventKey = body.eventKey;
  if (typeof eventKey !== "string" || eventKey.length === 0 || eventKey.length > MAX_EVENT_KEY_LENGTH) {
    return { type: "invalid", status: 400, reason: "eventKey" };
  }
  const re = kind === "sheet" ? SHEET_KEY_RE : FORM_KEY_RE;
  if (!re.test(eventKey)) return { type: "invalid", status: 400, reason: "eventKey" };

  if (!isPlainObject(body.values)) return { type: "invalid", status: 400, reason: "values" };

  return { type: "v2", formSourceId, kind, dedupeKey: `v2:${kind}:${eventKey}` };
}
